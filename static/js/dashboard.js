        let currentData = null; // 保存当前数据用于错误回滚
        
        // 分页配置与状态
        const paginationState = {
            dishes: {
                containerId: 'dish-container',
                pageSize: 8,
                currentPage: 0,
                renderFunc: renderDishesPage
            },
            chefDaily: {
                containerId: 'chef-daily-container',
                pageSize: 8,
                currentPage: 0,
                renderFunc: renderChefDailyPage
            },
            chefMonthly: {
                containerId: 'chef-monthly-container',
                pageSize: 3,
                currentPage: 0,
                renderFunc: renderChefMonthlyPage
            }
        };

        let pageInterval = null;

        function renderPage(data) {
            currentData = data; // 更新全局引用
            const config = data.config || {};
            const dishes = data.dishes || [];
            const chefs = data.chefs || [];

            // 1. 配置基础信息
            document.getElementById('page-title').innerText = config.title || "餐厅看板";
            document.getElementById('date-location').innerText = `📍 ${config.date || ''}`;

            // 处理 Logo 图片 (即使没数据也显示个默认占位，防止彻底消失)
            const logoImg = document.getElementById('footer-logo');
            logoImg.src = config.logo_url || 'static/logo.png?v=20260702';
            logoImg.onerror = function() { this.style.display = 'none'; }; // 图片坏了就隐藏

            // 重置/校验当前页码（如果数据变动导致总页数变少，重置为 0）
            Object.keys(paginationState).forEach(key => {
                const state = paginationState[key];
                const dataArray = getPaginationData(key);
                const totalPages = Math.ceil(dataArray.length / state.pageSize);
                if (state.currentPage >= totalPages) {
                    state.currentPage = 0;
                }
                // 渲染当前页
                state.renderFunc(dataArray, state.currentPage);
            });

            // 2. 渲染主厨个人卡片 (始终基于日榜第一名，即使日榜在第二页，也显示第一名)
            const sortedChefs = [...chefs].sort((a,b) => a.daily_rank - b.daily_rank);
            const topChef = sortedChefs.length > 0 ? sortedChefs[0] : null;
            const card = document.getElementById('profile-card');

            if (topChef) {
                card.style.display = "block"; // 显示卡片
                card.innerHTML = `
                    <div class="profile-header">
                        <img src="${topChef.photo}" class="chef-photo" onerror="this.src='static/logo.png?v=20260702'">
                        <div class="chef-details">
                            <h4>${topChef.name} <span>${topChef.role}</span></h4>
                            <p>${topChef.desc}</p>
                            <div style="margin-top: 5px; font-size: 10px; color: #718096; font-weight: 500;">
                                🏆 日榜第${topChef.daily_rank} | 📊 月榜第${topChef.monthly_rank} | 🎫 ${topChef.monthly_votes}票
                            </div>
                        </div>
                    </div>
                    <div class="qr-section">
                        <div class="qr-box">
                            <img id="qr-vote" src="" class="qr-img">
                            <div class="qr-label">📱 扫码投票</div>
                            <div class="qr-desc">为喜欢的菜品点赞</div>
                        </div>
                        <div class="qr-box">
                            <img id="qr-forum" src="" class="qr-img">
                            <div class="qr-label">💬 心声墙</div>
                            <div class="qr-desc">匿名分享你的想法</div>
                        </div>
                    </div>
                `;
                
                // 加载真实二维码
                loadQRCode('vote');
                loadQRCode('forum');
            } else {
                card.style.display = "none";
            }
            
            // 启动定时翻页
            startPageRotation();
        }

        // 渲染单页菜品
        function renderDishesPage(dishes, pageIndex) {
            const pageSize = paginationState.dishes.pageSize;
            const start = pageIndex * pageSize;
            const pageDishes = dishes.slice(start, start + pageSize);
            
            const dishHtml = pageDishes.map((dish, index) => {
                const rank = start + index + 1;
                
                let trendIconHtml = '';
                if (window.dishTrends && window.dishTrends[dish.id] === 'up') {
                    trendIconHtml = '<span class="trend-icon trend-up">⬆️</span>';
                } else if (window.dishTrends && window.dishTrends[dish.id] === 'down') {
                    trendIconHtml = '<span class="trend-icon trend-down">⬇️</span>';
                }
                
                if (rank === 1) {
                    return `
                        <div class="dish-item-top1" data-dish-id="${dish.id}">
                            <div class="rank-badge-top1">1</div>
                            <div style="flex: 1; display: flex; flex-direction: column; z-index: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div class="dish-info-top1">👑 ${dish.name} ${trendIconHtml} <span>${dish.chef}</span></div>
                                    <div class="vote-stats-top1">
                                        <span style="color: #059669;">👍 ${dish.up}</span>
                                        <span style="color: #dc2626; margin-left: 12px;">👎 ${dish.down}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (rank === 2) {
                    return `
                        <div class="dish-item-top2" data-dish-id="${dish.id}">
                            <div class="rank-badge-top2">2</div>
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div class="dish-info-top2">🥈 ${dish.name} ${trendIconHtml} <span>${dish.chef}</span></div>
                                    <div class="vote-stats-top2">
                                        <span style="color: #059669;">👍 ${dish.up}</span>
                                        <span style="color: #dc2626; margin-left: 10px;">👎 ${dish.down}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (rank === 3) {
                    return `
                        <div class="dish-item-top3" data-dish-id="${dish.id}">
                            <div class="rank-badge-top3">3</div>
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div class="dish-info-top3">🥉 ${dish.name} ${trendIconHtml} <span>${dish.chef}</span></div>
                                    <div class="vote-stats-top3">
                                        <span style="color: #059669;">👍 ${dish.up}</span>
                                        <span style="color: #dc2626; margin-left: 8px;">👎 ${dish.down}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="dish-item" data-dish-id="${dish.id}">
                        <div class="rank-badge">${rank}</div>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div class="dish-info">${dish.name} ${trendIconHtml} - <span>${dish.chef}</span></div>
                                <div class="vote-stats">
                                    <span style="color: #10b981;">👍 ${dish.up}</span>
                                    <span style="color: #ef4444; margin-left: 8px;">👎 ${dish.down}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            document.getElementById('dish-container').innerHTML = dishHtml;
        }

        // 渲染单页日榜厨师
        function renderChefDailyPage(chefs, pageIndex) {
            const pageSize = paginationState.chefDaily.pageSize;
            const start = pageIndex * pageSize;
            const pageChefs = chefs.slice(start, start + pageSize);
            
            document.getElementById('chef-daily-container').innerHTML = pageChefs.map((chef, index) => {
                const rank = chef.daily_rank;
                let trendIconHtml = '';
                if (window.chefDailyTrends && window.chefDailyTrends[chef.name] === 'up') {
                    trendIconHtml = '<span class="trend-icon trend-up">⬆️</span>';
                } else if (window.chefDailyTrends && window.chefDailyTrends[chef.name] === 'down') {
                    trendIconHtml = '<span class="trend-icon trend-down">⬇️</span>';
                }
                return `
                    <div class="chef-list-item">
                        <div class="rank-badge ${rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : ''}">${rank}</div>
                        <img src="${chef.photo}" class="chef-photo" onerror="this.src='static/logo.png?v=20260702'">
                        <div class="chef-details">
                            <h4>${chef.name} ${trendIconHtml}</h4>
                            <p>${chef.desc}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 渲染单页月榜厨师
        function renderChefMonthlyPage(chefs, pageIndex) {
            const pageSize = paginationState.chefMonthly.pageSize;
            const start = pageIndex * pageSize;
            const pageChefs = chefs.slice(start, start + pageSize);
            const medals = ['🥇', '🥈', '🥉']; // 金银铜牌
            
            document.getElementById('chef-monthly-container').innerHTML = pageChefs.map((chef, index) => {
                const medal = medals[chef.monthly_rank - 1] || chef.monthly_rank;
                return `
                    <div class="month-rank-item">
                        <div class="medal">${medal}</div>
                        <img src="${chef.photo}" class="chef-mini-photo" onerror="this.src='static/logo.png?v=20260702'">
                        <div class="month-details">
                            <strong>${chef.name}</strong>
                            <span>本月得票: ${chef.monthly_votes}</span>
                        </div>
                        <div class="month-score">月度第${chef.monthly_rank}名</div>
                    </div>
                `;
            }).join('');
        }

        // 启动定时翻页旋转
        function startPageRotation() {
            if (pageInterval) {
                clearInterval(pageInterval);
            }
            
            pageInterval = setInterval(() => {
                Object.keys(paginationState).forEach(key => {
                    const state = paginationState[key];
                    const dataArray = getPaginationData(key);
                    if (!dataArray || dataArray.length <= state.pageSize) {
                        return; // 数据未超过单页容量，不翻页
                    }
                    
                    const totalPages = Math.ceil(dataArray.length / state.pageSize);
                    const container = document.getElementById(state.containerId);
                    if (!container) return;
                    
                    // 1. 渐隐
                    container.classList.add('fade-out');
                    
                    // 2. 等待渐隐动画，渲染下一页并渐显
                    setTimeout(() => {
                        state.currentPage = (state.currentPage + 1) % totalPages;
                        state.renderFunc(dataArray, state.currentPage);
                        container.classList.remove('fade-out');
                    }, 400);
                });
            }, 8000); // 每 8 秒翻页一次
        }

        // 获取特定类型的数据源
        function getPaginationData(key) {
            if (!currentData) return [];
            if (key === 'dishes') {
                return currentData.dishes || [];
            }
            if (key === 'chefDaily') {
                const chefs = currentData.chefs || [];
                return [...chefs].sort((a,b) => a.daily_rank - b.daily_rank);
            }
            if (key === 'chefMonthly') {
                const chefs = currentData.chefs || [];
                return [...chefs].sort((a,b) => a.monthly_rank - b.monthly_rank).slice(0, 3);
            }
            return [];
        }

        // 加载二维码
        function loadQRCode(type) {
            fetch(`/api/qrcode/${type}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const img = document.getElementById(`qr-${type}`);
                        if (img) {
                            img.src = data.qrcode;
                        }
                    }
                })
                .catch(err => console.error('加载二维码失败:', err));
        }

        // 趋势追踪
        let previousData = null;
        window.dishTrends = {}; // { dishId: 'up' | 'down' }
        window.chefDailyTrends = {}; // { chefName: 'up' | 'down' }

        function calculateTrends(oldData, newData) {
            window.dishTrends = {};
            window.chefDailyTrends = {};
            
            if (!oldData || !oldData.dishes || !newData.dishes) return;
            
            // 菜品排名比较
            newData.dishes.forEach((newDish, newIndex) => {
                const oldIndex = oldData.dishes.findIndex(d => d.id === newDish.id);
                if (oldIndex !== -1) {
                    if (newIndex < oldIndex) window.dishTrends[newDish.id] = 'up';
                    else if (newIndex > oldIndex) window.dishTrends[newDish.id] = 'down';
                }
            });

            // 厨师日榜比较
            if (!oldData.chefs || !newData.chefs) return;
            const oldChefs = [...oldData.chefs].sort((a,b) => a.daily_rank - b.daily_rank);
            const newChefs = [...newData.chefs].sort((a,b) => a.daily_rank - b.daily_rank);

            newChefs.forEach(newChef => {
                const oldChef = oldChefs.find(c => c.name === newChef.name);
                if (oldChef) {
                    if (newChef.daily_rank < oldChef.daily_rank) window.chefDailyTrends[newChef.name] = 'up';
                    else if (newChef.daily_rank > oldChef.daily_rank) window.chefDailyTrends[newChef.name] = 'down';
                }
            });
        }

        // 加载数据函数
        function loadData(isInitialLoad = false) {
            fetch('/api/data')
                .then(res => res.json())
                .then(data => {
                    // 深度比对：如果数据没有任何变化，直接跳过渲染，避免页面闪烁或二维码重新加载
                    if (!isInitialLoad && previousData && JSON.stringify(previousData) === JSON.stringify(data)) {
                        console.log('✅ 数据无变化，静默维持原状');
                        return;
                    }

                    // 初始化时从后端读取设定的刷新时间
                    if (isInitialLoad && data.config && data.config.refresh_interval) {
                        REFRESH_INTERVAL = data.config.refresh_interval * 1000;
                    }

                    calculateTrends(previousData, data);
                    previousData = data;
                    currentData = data;
                    
                    renderPage(data);
                    
                    console.log('✅ 数据已刷新:', new Date().toLocaleTimeString());
                })
                .catch(err => {
                    console.error("数据加载失败:", err);
                    document.getElementById('page-title').innerText = "无法连接数据服务";
                });
        }

        // 自动刷新：默认从后端读取，或者回退到5秒
        let autoRefreshInterval = null;
        let countdownInterval = null;
        let REFRESH_INTERVAL = 5 * 1000; // 默认 5 秒
        
        function updateRefreshTimer(seconds) {
            const timerEl = document.getElementById('refresh-timer');
            if (timerEl) {
                const minutes = Math.floor(seconds / 60);
                const secs = seconds % 60;
                timerEl.textContent = `自动刷新: ${minutes}:${String(secs).padStart(2, '0')}`;
                
                // 绑定点击事件，允许修改刷新时间并保存到服务器
                if (!timerEl.onclick) {
                    timerEl.onclick = () => {
                        const input = prompt("请输入刷新间隔（秒）", REFRESH_INTERVAL / 1000);
                        if (input && !isNaN(input) && Number(input) > 0) {
                            const newSeconds = Number(input);
                            REFRESH_INTERVAL = newSeconds * 1000;
                            
                            // 同步到服务器
                            fetch('/api/config/interval', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ interval: newSeconds })
                            }).then(res => res.json())
                              .then(res => console.log('刷新间隔已保存至服务器:', res))
                              .catch(err => console.error('保存刷新间隔失败:', err));

                            startAutoRefresh();
                        }
                    };
                }
            }
        }
        
        function startAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            
            autoRefreshInterval = setInterval(() => {
                console.log('🔄 自动刷新数据...');
                loadData();
                startCountdown();
            }, REFRESH_INTERVAL);
            
            startCountdown();
            console.log('✅ 自动刷新已启动（每5分钟）');
        }
        
        function startCountdown() {
            let remaining = REFRESH_INTERVAL / 1000; // 转换为秒
            updateRefreshTimer(remaining);
            
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            
            countdownInterval = setInterval(() => {
                remaining--;
                if (remaining <= 0) {
                    remaining = REFRESH_INTERVAL / 1000;
                }
                updateRefreshTimer(remaining);
            }, 1000);
        }

        // 页面启动时加载数据并启动自动刷新
        loadData(true);
        setTimeout(startAutoRefresh, 500); // 延迟启动计时器，确保先读取到配置
