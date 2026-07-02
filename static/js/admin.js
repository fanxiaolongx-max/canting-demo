        let adminToken = localStorage.getItem('admin_token') || '';
        let currentPhotoTarget = null;

        // 获取请求头
        function getHeaders() {
            return {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            };
        }

        // 初始化
        function init() {
            if (!adminToken) {
                promptForToken();
                return;
            }
            loadAll();
        }

        // 提示输入密钥
        function promptForToken() {
            const token = prompt('请输入管理密钥（默认: demo2024）：', 'demo2024');
            if (token) {
                adminToken = token;
                localStorage.setItem('admin_token', token);
                loadAll();
            } else {
                showToast('需要访问密钥才能使用后台管理', 'error');
            }
        }

        // 加载所有数据
        async function loadAll() {
            try {
                await loadConfig();
                await loadDishes();
                await loadChefs();
            } catch (err) {
                console.error('加载失败:', err);
                showToast('加载失败，请检查网络连接', 'error');
            }
        }

        // 加载配置
        async function loadConfig() {
            try {
                const res = await fetch('/api/admin/config', { headers: getHeaders() });
                if (!res.ok) throw new Error('获取配置失败');
                const data = await res.json();
                
                document.getElementById('config-title').value = data.config.title || '';
                document.getElementById('config-date').value = data.config.date_location || '';
                document.getElementById('config-auto-date').checked = data.config.auto_date === 1;
            } catch (err) {
                console.error('加载配置失败:', err);
            }
        }

        // 保存配置
        async function saveConfig() {
            const config = {
                title: document.getElementById('config-title').value,
                date_location: document.getElementById('config-date').value,
                auto_date: document.getElementById('config-auto-date').checked
            };

            try {
                const res = await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(config)
                });

                if (!res.ok) throw new Error('保存失败');
                showToast('✅ 配置已保存', 'success');
            } catch (err) {
                showToast('保存失败: ' + err.message, 'error');
            }
        }

        // 加载菜品
        async function loadDishes() {
            try {
                const res = await fetch('/api/admin/dishes', { headers: getHeaders() });
                if (!res.ok) throw new Error('获取菜品失败');
                const data = await res.json();
                
                renderDishes(data.dishes);
            } catch (err) {
                console.error('加载菜品失败:', err);
                document.getElementById('dishes-tbody').innerHTML = 
                    '<tr><td colspan="6" style="text-align: center; color: red;">加载失败</td></tr>';
            }
        }

        // 渲染菜品表格
        function renderDishes(dishes) {
        const tbody = document.getElementById('dishes-tbody');
        
        if (dishes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">暂无菜品</td></tr>';
            return;
        }
    
        // 👇 注意这里：改成了 (dish, index)
        tbody.innerHTML = dishes.map((dish, index) => `
            <tr data-id="${dish.id}">
                <td>${index + 1}</td>
                <td><input type="text" class="table-input" value="${dish.name}" onchange="updateDish(${dish.id}, 'name', this.value)"></td>
                <td><input type="text" class="table-input" value="${dish.chef}" onchange="updateDish(${dish.id}, 'chef', this.value)"></td>
                <td><input type="number" class="table-input table-input-small" value="${dish.up_votes}" onchange="updateDish(${dish.id}, 'up_votes', this.value)"></td>
                <td><input type="number" class="table-input table-input-small" value="${dish.down_votes}" onchange="updateDish(${dish.id}, 'down_votes', this.value)"></td>
                <td class="action-btns">
                    <button class="btn btn-danger" onclick="deleteDish(${dish.id})">删除</button>
                </td>
            </tr>
        `).join('');
    }

        // 更新菜品
        async function updateDish(id, field, value) {
            const row = document.querySelector(`#dishes-tbody tr[data-id="${id}"]`);
            const data = {
                name: row.querySelector('input[type="text"]').value,
                chef: row.querySelectorAll('input[type="text"]')[1].value,
                up_votes: parseInt(row.querySelectorAll('input[type="number"]')[0].value) || 0,
                down_votes: parseInt(row.querySelectorAll('input[type="number"]')[1].value) || 0
            };

            try {
                const res = await fetch(`/api/admin/dishes/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(data)
                });

                if (!res.ok) throw new Error('更新失败');
                showToast('✅ 已更新', 'success');
            } catch (err) {
                showToast('更新失败: ' + err.message, 'error');
            }
        }

        // 添加菜品
        async function addDish() {
            const data = {
                name: '新菜品',
                chef: '新厨师',
                up_votes: 0,
                down_votes: 0
            };

            try {
                const res = await fetch('/api/admin/dishes', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(data)
                });

                if (!res.ok) throw new Error('创建失败');
                showToast('✅ 已添加新菜品', 'success');
                await loadDishes();
            } catch (err) {
                showToast('添加失败: ' + err.message, 'error');
            }
        }

        // 删除菜品
        async function deleteDish(id) {
            if (!confirm('确定要删除这道菜品吗？')) return;

            try {
                const res = await fetch(`/api/admin/dishes/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });

                if (!res.ok) throw new Error('删除失败');
                showToast('✅ 已删除', 'success');
                await loadDishes();
            } catch (err) {
                showToast('删除失败: ' + err.message, 'error');
            }
        }

        // 加载厨师
        async function loadChefs() {
            try {
                const res = await fetch('/api/admin/chefs', { headers: getHeaders() });
                if (!res.ok) throw new Error('获取厨师失败');
                const data = await res.json();
                
                renderChefs(data.chefs);
            } catch (err) {
                console.error('加载厨师失败:', err);
                document.getElementById('chefs-tbody').innerHTML = 
                    '<tr><td colspan="9" style="text-align: center; color: red;">加载失败</td></tr>';
            }
        }

        // 渲染厨师表格
        function renderChefs(chefs) {
            const tbody = document.getElementById('chefs-tbody');
            
            if (chefs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #999;">暂无厨师</td></tr>';
                return;
            }

            tbody.innerHTML = chefs.map(chef => `
                <tr data-id="${chef.id}">
                    <td>${chef.id}</td>
                    <td>
                        <img src="${chef.photo}" class="img-preview" onclick="changePhoto(${chef.id})" title="点击更换照片">
                    </td>
                    <td><input type="text" class="table-input" value="${chef.name}" onchange="updateChef(${chef.id})"></td>
                    <td><input type="text" class="table-input" value="${chef.role}" onchange="updateChef(${chef.id})"></td>
                    <td><input type="text" class="table-input" value="${chef.description || ''}" onchange="updateChef(${chef.id})"></td>
                    <td><input type="number" class="table-input table-input-small" value="${chef.daily_rank}" onchange="updateChef(${chef.id})"></td>
                    <td><input type="number" class="table-input table-input-small" value="${chef.monthly_rank}" onchange="updateChef(${chef.id})"></td>
                    <td><input type="number" class="table-input table-input-small" value="${chef.monthly_votes}" onchange="updateChef(${chef.id})"></td>
                    <td class="action-btns">
                        <button class="btn btn-danger" onclick="deleteChef(${chef.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }

        // 更新厨师
        async function updateChef(id) {
            const row = document.querySelector(`#chefs-tbody tr[data-id="${id}"]`);
            const inputs = row.querySelectorAll('input');
            const data = {
                name: inputs[0].value,
                role: inputs[1].value,
                description: inputs[2].value,
                daily_rank: parseInt(inputs[3].value) || 99,
                monthly_rank: parseInt(inputs[4].value) || 99,
                monthly_votes: parseInt(inputs[5].value) || 0,
                photo: row.querySelector('img').src
            };

            try {
                const res = await fetch(`/api/admin/chefs/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(data)
                });

                if (!res.ok) throw new Error('更新失败');
                showToast('✅ 已更新', 'success');
            } catch (err) {
                showToast('更新失败: ' + err.message, 'error');
            }
        }

        // 添加厨师
        async function addChef() {
            const data = {
                name: '新厨师',
                role: '厨师',
                photo: 'static/logo.png?v=20260702',
                description: '请修改简介',
                daily_rank: 99,
                monthly_rank: 99,
                monthly_votes: 0
            };

            try {
                const res = await fetch('/api/admin/chefs', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(data)
                });

                if (!res.ok) throw new Error('创建失败');
                showToast('✅ 已添加新厨师', 'success');
                await loadChefs();
            } catch (err) {
                showToast('添加失败: ' + err.message, 'error');
            }
        }

        // 删除厨师
        async function deleteChef(id) {
            if (!confirm('确定要删除这位厨师吗？')) return;

            try {
                const res = await fetch(`/api/admin/chefs/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });

                if (!res.ok) throw new Error('删除失败');
                showToast('✅ 已删除', 'success');
                await loadChefs();
            } catch (err) {
                showToast('删除失败: ' + err.message, 'error');
            }
        }

        // 更换照片
        function changePhoto(chefId) {
            currentPhotoTarget = chefId;
            document.getElementById('file-input-photo').click();
        }

        // 处理照片上传
        document.getElementById('file-input-photo').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'x-admin-token': adminToken },
                    body: formData
                });

                if (!res.ok) throw new Error('上传失败');
                const data = await res.json();

                // 更新图片
                const row = document.querySelector(`#chefs-tbody tr[data-id="${currentPhotoTarget}"]`);
                row.querySelector('img').src = data.url;

                await updateChef(currentPhotoTarget);
                showToast('✅ 照片已更新', 'success');
            } catch (err) {
                showToast('上传失败: ' + err.message, 'error');
            }

            e.target.value = '';
        });

        // 导出菜品
        function exportDishes() {
            fetch('/api/admin/dishes', { headers: getHeaders() })
                .then(res => res.json())
                .then(data => {
                    const csv = dishesToCSV(data.dishes);
                    downloadCSV(csv, 'dishes.csv');
                    showToast('✅ 已导出', 'success');
                });
        }

        // 导出厨师
        function exportChefs() {
            fetch('/api/admin/chefs', { headers: getHeaders() })
                .then(res => res.json())
                .then(data => {
                    const csv = chefsToCSV(data.chefs);
                    downloadCSV(csv, 'chefs.csv');
                    showToast('✅ 已导出', 'success');
                });
        }

        // 导出所有数据
        async function exportAllData() {
            try {
                const [configRes, dishesRes, chefsRes] = await Promise.all([
                    fetch('/api/admin/config', { headers: getHeaders() }),
                    fetch('/api/admin/dishes', { headers: getHeaders() }),
                    fetch('/api/admin/chefs', { headers: getHeaders() })
                ]);

                const [config, dishes, chefs] = await Promise.all([
                    configRes.json(),
                    dishesRes.json(),
                    chefsRes.json()
                ]);

                const allData = {
                    config: config.config,
                    dishes: dishes.dishes,
                    chefs: chefs.chefs,
                    exported_at: new Date().toISOString()
                };

                const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `restaurant-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);

                showToast('✅ 已导出所有数据', 'success');
            } catch (err) {
                showToast('导出失败: ' + err.message, 'error');
            }
        }

        // CSV 转换
        function dishesToCSV(dishes) {
            const headers = ['ID', '菜品名称', '厨师', '点赞数', '踩数'];
            const rows = dishes.map(d => [d.id, d.name, d.chef, d.up_votes, d.down_votes]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }

        function chefsToCSV(chefs) {
            const headers = ['ID', '姓名', '职位', '简介', '日榜', '月榜', '月票', '照片'];
            const rows = chefs.map(c => [c.id, c.name, c.role, c.description, c.daily_rank, c.monthly_rank, c.monthly_votes, c.photo]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }

        function downloadCSV(csv, filename) {
            const BOM = '\uFEFF';  // UTF-8 BOM
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        // 批量导入（简化版）
        function importDishes() {
            alert('批量导入功能：\n请准备CSV文件，格式：菜品名称,厨师,点赞数,踩数\n然后选择文件导入。');
            document.getElementById('file-input-dishes').click();
        }

        function importChefs() {
            alert('批量导入功能：\n请准备CSV文件，格式：姓名,职位,简介,日榜,月榜,月票\n然后选择文件导入。');
            document.getElementById('file-input-chefs').click();
        }

        // 重置密钥
        function resetToken() {
            if (confirm('确定要重置访问密钥吗？')) {
                localStorage.removeItem('admin_token');
                location.reload();
            }
        }

        // 显示提示
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }

        // 初始化
        // --- 智能导入功能 (空格/表情修复版) ---
        function openSmartImport() {
            document.getElementById('smart-import-modal').style.display = 'flex';
            document.getElementById('import-text').value = '';
            document.getElementById('import-preview').style.display = 'none';
        }
        
        let parsedDishes = [];
        let parsedIgnoredItems = [];
        
        // 核心入口函数
        function parseMenuText() {
            const text = document.getElementById('import-text').value;
            if (!text.trim()) { showToast('请先粘贴文本', 'error'); return; }
        
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            parsedDishes = [];
            parsedIgnoredItems = [];
        
            // --- 1. 识别餐段与日期 ---
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let mealType = '午餐'; // 默认
            
            // 扫描前10行找关键词
            const headerText = lines.slice(0, 10).join(' ');
            if (headerText.includes('早餐')) mealType = '早餐';
            else if (headerText.includes('晚餐')) mealType = '晚餐';
            else if (headerText.includes('夜宵')) mealType = '夜宵';
            else if (headerText.includes('午餐')) mealType = '午餐';
            else {
                // 时间兜底
                const h = now.getHours();
                if (h < 10) mealType = '早餐';
                else if (h > 19) mealType = '夜宵';
                else if (h > 14) mealType = '晚餐';
            }
        
            // 自动更新配置
            const newDateLocation = `${dateStr} ${mealType}`;
            console.log(`📅 识别模式: [${mealType}]`);
            const dateInput = document.getElementById('config-date');
            const autoCheck = document.getElementById('config-auto-date');
            if (dateInput && autoCheck) {
                dateInput.value = newDateLocation;
                autoCheck.checked = false;
                showToast(`已切换为: ${mealType}模式`);
            }
        
            // --- 2. 分流处理 ---
            if (mealType === '早餐') {
                parseBreakfastMode(lines);
            } else if (mealType === '夜宵') {
                parseNightSnackMode(lines);
            } else {
                parseLunchDinnerMode(lines); // 午餐和晚餐结构相似
            }
        
            renderPreview();
        }
        
        // ==========================================
        // 模式 A: 早餐解析引擎
        // ==========================================
        function parseBreakfastMode(lines) {
            let mainChef = '早餐厨师';
            
            lines.forEach(line => {
                if (line.includes('厨师') || line.includes('主厨')) {
                    const parts = line.replace(/[:：]/g, ':').split(':');
                    if (parts[1]) {
                        const name = parts[1].replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim(); 
                        if (isValidName(name)) mainChef = name;
                    }
                }
            });
        
            const ignoreHeaders = ['中式早餐', '西点', '饮品', '水果', '欢迎您', 'SV餐厅'];
            
            lines.forEach(line => {
                if (line.includes('厨师') || line.includes('主厨')) return;
                
                // 清洗文本: 移除 [xxx] 和 emoji
                let clean = line.replace(/\[.*?\]/g, '') // 移除 [庆祝] [玫瑰] 等
                                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') 
                                .replace(/[🍳🥘🐟🍔🍓🦐🍜🍉🥬🍞🥞🍕🥦🌽🥛🥚🥤]/g, '')
                                .trim();
        
                if (clean.length < 2) return;
                if (ignoreHeaders.some(h => clean.includes(h))) return;
                if (clean.includes('太阳') || clean.includes('祝大家')) return;
        
                const items = clean.split(/[\s\/]+/); 
                items.forEach(item => {
                    if (item.length > 1 && !/\d/.test(item)) {
                        parsedDishes.push({ name: item, chef: mainChef });
                    }
                });
            });
        }
        
        // ==========================================
        // 模式 B: 夜宵解析引擎
        // ==========================================
        function parseNightSnackMode(lines) {
            let currentPrefix = '中式';
        
            lines.forEach(line => {
                let clean = line.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
                                .replace(/[\*\🌸]/g, '').trim();
        
                if (clean.length < 2) return;
                if (clean.includes('祝大家') || clean.includes('欢迎')) return;
        
                if (clean.includes('中餐') || clean.includes('今日菜单')) {
                    currentPrefix = '中式';
                    return;
                }
                if (clean.includes('本地') || clean.includes('埃及')) {
                    currentPrefix = '本地';
                    return;
                }
        
                clean = clean.replace(/[🐔🐟🥬🍪🍐🍠🧃🥚]/g, '').trim();
                clean = clean.replace(/(一份|一盒|一只|一个)/g, '');
        
                if (clean.length > 1) {
                    parsedDishes.push({ 
                        name: clean, 
                        chef: currentPrefix === '本地' ? '本地风味' : '中式夜宵' 
                    });
                }
            });
        }
        
        // ==========================================
        // 模式 C: 午餐/晚餐解析引擎 (修复空格和表情)
        // ==========================================
        function parseLunchDinnerMode(lines) {
            // 1. 预扫描厨师
            let mainChefs = [];
            let noodleChef = '';       
            let grillChef = '';
            const allChefNames = new Set(); 
        
            lines.forEach(line => {
                const clean = line.replace(/[:：]/g, ':').trim();
                if (clean.includes('主厨') && !clean.includes('副厨') && !clean.includes('面档')) {
                    const content = clean.split(':')[1];
                    if (content) content.trim().split(/\s+/).forEach(name => {
                        if (isValidName(name)) { mainChefs.push(name); allChefNames.add(name); }
                    });
                }
                if (clean.includes('副厨')) {
                    (clean.split(':')[1]||clean).trim().split(/\s+/).forEach(n => { if(isValidName(n)) allChefNames.add(n); });
                }
                if (clean.includes('面档')) {
                    const names = (clean.split(':')[1]||'').trim().split(/\s+/);
                    if (isValidName(names[0])) { noodleChef = names[0]; allChefNames.add(names[0]); }
                }
            });
        
            const mainChefsString = mainChefs.length > 0 ? mainChefs.join(' ') : '当日厨师';
            if (!noodleChef) noodleChef = mainChefs[0] || '面档师傅';
            if (!grillChef) grillChef = mainChefsString; 
        
            // 2. 状态机解析
            let currentCategory = 'unknown'; 
            let currentChef = mainChefsString;
            
            // 允许带空格的匹配，例如 "明 档" -> 匹配 "明档"
            const validCategories = {
                '荤菜': mainChefsString,
                '素菜': mainChefsString,
                '粗粮': mainChefsString,
                '汤类': mainChefsString,
                '明档': grillChef,      
                '特色档': grillChef,    
                '面食': noodleChef,
                '面档': noodleChef
            };
        
            const ignoreKeywordsInput = document.getElementById('config-ignore-keywords');
            const ignoreCategories = ignoreKeywordsInput ? ignoreKeywordsInput.value.split(',').map(s => s.trim()).filter(s => s) : ['鲜榨果汁', '果汁', '主食', '温馨提示', '充值', '小菜'];
            const stopKeywords = ['祝大家用餐愉快', '欢迎大家', '温馨提示'];
        
            let stopParsing = false;
        
            lines.forEach(line => {
                if (stopParsing) return;
                let cleanLine = line.trim();
                if (!cleanLine) return;
        
                if (stopKeywords.some(kw => cleanLine.includes(kw))) {
                    stopParsing = true;
                    return;
                }
        
                // 关键修复 1: 生成无空格、无符号的标题用于匹配
                // "   明   档 :" -> "明档"
                let headerText = cleanLine.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
                                          .replace(/[🍽🥙🍠🥣🍜]/g, '')
                                          .replace(/[:：]/g, '')
                                          .replace(/\s+/g, '') // 移除所有空格
                                          .trim();
                
                // 检查忽略分类
                let matchedIgnoreCat = false;
                for (const badCat of ignoreCategories) {
                    if (headerText.startsWith(badCat) || cleanLine.includes(badCat)) {
                        matchedIgnoreCat = true;
                        parsedIgnoredItems.push(cleanLine || line.trim());
                        
                        // 如果明确是分类头（完全匹配，或者带有冒号），则把状态切换为 ignore
                        if (headerText === badCat || cleanLine.includes(':') || cleanLine.includes('：')) {
                            currentCategory = 'ignore';
                        }
                        break;
                    }
                }
                if (matchedIgnoreCat) return;

                // 检查有效分类
                let matchedValidCat = false;
                for (const cat in validCategories) {
                    if (headerText === cat || (headerText.startsWith(cat) && (cleanLine.includes(':') || cleanLine.includes('：')))) {
                        currentCategory = 'active';
                        currentChef = validCategories[cat];
                        matchedValidCat = true;
                        
                        // 处理同一行的内容，并在分类检测通过后，移除分类前缀
                        if (cleanLine.includes(':') || cleanLine.includes('：')) {
                            const parts = cleanLine.split(/[:：]/);
                            if (parts[1] && parts[1].trim() !== '') {
                                cleanLine = parts[1]; // 取冒号后的内容作为菜品
                            } else {
                                return; // 冒号后没内容，是纯标题行
                            }
                        } else {
                            return; // 纯标题行，跳过
                        }
                        break; 
                    }
                }
        
                if (currentCategory === 'unknown' || currentCategory === 'ignore') {
                    if (currentCategory === 'ignore') {
                        parsedIgnoredItems.push(cleanLine || line.trim());
                    }
                    return;
                }
        
                // 关键修复 2: 清洗内容，移除 [玫瑰] 等
                cleanLine = cleanLine.replace(/\[.*?\]/g, '') // 移除所有中括号内容
                                     .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Emoji
                                     .replace(/[\[\]🐮🐟🐔🥩🥒🍆🥬🍍🥑🧋🦞🐂🎃🫓]/g, '') // 食材图标
                                     .replace(/^[:：]/, '') // 移除行首可能残留的冒号
                                     .trim();
        
                if (cleanLine.includes('月亮') || cleanLine.includes('太阳') || cleanLine.length < 2) return;
                if (allChefNames.has(cleanLine)) return;
        
                // 分割 (支持逗号、空格)
                const items = cleanLine.split(/[\s,，]+/);
                items.forEach(item => {
                    if (item.length > 1 && !/\d/.test(item) && !item.includes('微信') && !allChefNames.has(item)) { 
                        parsedDishes.push({ name: item, chef: currentChef });
                    }
                });
            });
        }
        
        // 辅助函数
        function isValidName(name) {
            return name && name.length > 1 && name.length < 5 && !/[\d\w]/.test(name);
        }
        
        function renderPreview() {
            const tbody = document.getElementById('preview-tbody');
            tbody.innerHTML = '';
            document.getElementById('preview-count').textContent = parsedDishes.length;
            
            const ignoredContainer = document.getElementById('ignored-items-container');
            const ignoredList = document.getElementById('ignored-items-list');
            if (parsedIgnoredItems.length > 0) {
                ignoredContainer.style.display = 'block';
                ignoredList.innerHTML = parsedIgnoredItems.map(item => `<div>- ${item}</div>`).join('');
            } else {
                ignoredContainer.style.display = 'none';
            }

            if (parsedDishes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">未识别到有效菜品，请检查文本格式</td></tr>';
                document.getElementById('import-preview').style.display = 'block';
                return;
            }
        
            parsedDishes.forEach((dish, index) => {
                let chefStyle = '';
                if (dish.chef.includes(' ')) chefStyle = 'color:#0f6b48; font-weight:bold;'; // 多主厨
                else if (dish.chef.includes('面')) chefStyle = 'color:#e65100; font-weight:bold;'; // 面档
                else if (dish.chef.includes('夜宵') || dish.chef.includes('本地')) chefStyle = 'color:#667eea; font-weight:bold;'; // 夜宵
        
                tbody.innerHTML += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px;">
                            <input type="text" value="${dish.name}" class="table-input" onchange="parsedDishes[${index}].name = this.value">
                        </td>
                        <td style="padding:8px;">
                            <input type="text" value="${dish.chef}" class="table-input" style="${chefStyle}" onchange="parsedDishes[${index}].chef = this.value">
                        </td>
                        <td style="padding:8px; text-align:center;">
                            <button class="btn btn-danger" style="padding:2px 6px; font-size:12px;" onclick="removeParsedDish(${index})">×</button>
                        </td>
                    </tr>
                `;
            });
            document.getElementById('import-preview').style.display = 'block';
        }
        
        function removeParsedDish(index) {
            parsedDishes.splice(index, 1);
            renderPreview();
        }
        
        async function executeImport() {
            if (parsedDishes.length === 0) return;
            if (!confirm(`⚠️ 高能预警：\n\n即将清空【所有旧菜品】并导入 ${parsedDishes.length} 道新菜品。\n同时更新日期设置。\n\n确定要执行吗？`)) return;
            
            // 1. 保存日期配置
            try { await saveConfig(); } catch (e) {}
        
            // 2. 清空旧菜品
            let existingIds = [];
            try {
                const res = await fetch('/api/admin/dishes', { headers: getHeaders() });
                const data = await res.json();
                existingIds = data.dishes.map(d => d.id);
            } catch (e) { return; }
        
            for (const id of existingIds) {
                try { await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE', headers: getHeaders() }); } catch (e) {}
            }
        
            // 3. 导入新菜品
            let count = 0;
            for (const dish of parsedDishes) {
                try {
                    await fetch('/api/admin/dishes', {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({ name: dish.name, chef: dish.chef, up_votes: 0, down_votes: 0 })
                    });
                    count++;
                } catch (e) {}
            }
            
            showToast(`♻️ 菜单更新完成！已导入 ${count} 道菜`, 'success');
            document.getElementById('smart-import-modal').style.display = 'none';
            loadDishes(); 
            loadConfig(); 
        }
        // --- 智能导入功能 (增强版) ---END
        
        init();
