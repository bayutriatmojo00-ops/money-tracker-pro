class MoneyTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.investments = JSON.parse(localStorage.getItem('investments')) || [];
        this.investmentChart = null;
        this.init();
    }

    init() {
        this.renderTransactions();
        this.updateSummary();
        this.setupEventListeners();
        this.updateCategoryFilter();
        this.setDefaultDates();
        this.loadInvestments();
        this.initInvestmentChart();
    }

    setupEventListeners() {
        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Investment form
        document.getElementById('investmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInvestment();
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderTransactions();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.renderTransactions();
        });

        document.getElementById('filterType').addEventListener('change', () => {
            this.renderTransactions();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }
// === REPORT METHODS ===
showReportModal() {
    this.closeAllModals();
    document.getElementById('reportModal').style.display = 'block';
    this.generateReport();
    this.setupReportEventListeners();
}

closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

setupReportEventListeners() {
    // Period selector
    document.getElementById('reportPeriod').addEventListener('change', () => {
        this.generateReport();
    });

    // Chart tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const chartType = e.target.getAttribute('data-chart');
            this.switchReportChart(chartType);
        });
    });
}

generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const filteredData = this.filterDataByPeriod(period);
    
    this.updateReportSummary(filteredData);
    this.updateCategoryBreakdown(filteredData);
    this.updateMonthlyTrend();
    this.updateFinancialRatios(filteredData);
    this.initReportChart();
}

filterDataByPeriod(period) {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
        case 'quarterly':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'all':
        default:
            startDate = new Date(0); // All time
            break;
    }

    return this.transactions.filter(transaction => 
        new Date(transaction.date) >= startDate
    );
}

updateReportSummary(data) {
    const totalIncome = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestment = data
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    document.getElementById('reportIncome').textContent = 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalIncome);

    document.getElementById('reportExpense').textContent = 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalExpense);

    document.getElementById('reportInvestment').textContent = 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalInvestment);

    document.getElementById('reportBalance').textContent = 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(balance);

    // Update color based on balance
    const balanceElement = document.getElementById('reportBalance');
    if (balance < 0) {
        balanceElement.style.color = 'var(--danger)';
    } else {
        balanceElement.style.color = 'var(--success)';
    }
}

updateCategoryBreakdown(data) {
    const incomeCategories = {};
    const expenseCategories = {};

    // Group by category
    data.forEach(transaction => {
        if (transaction.type === 'income') {
            incomeCategories[transaction.category] = 
                (incomeCategories[transaction.category] || 0) + transaction.amount;
        } else if (transaction.type === 'expense') {
            expenseCategories[transaction.category] = 
                (expenseCategories[transaction.category] || 0) + transaction.amount;
        }
    });

    // Calculate totals for percentages
    const totalIncome = Object.values(incomeCategories).reduce((a, b) => a + b, 0);
    const totalExpense = Object.values(expenseCategories).reduce((a, b) => a + b, 0);

    // Update income categories
    const incomeContainer = document.getElementById('incomeCategories');
    incomeContainer.innerHTML = '';

    Object.entries(incomeCategories).forEach(([category, amount]) => {
        const percentage = totalIncome > 0 ? (amount / totalIncome * 100).toFixed(1) : 0;
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <span class="category-name">${category}</span>
            <div>
                <span class="category-amount" style="color: var(--success);">
                    ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
                </span>
                <span class="category-percentage">${percentage}%</span>
            </div>
        `;
        incomeContainer.appendChild(item);
    });

    // Update expense categories
    const expenseContainer = document.getElementById('expenseCategories');
    expenseContainer.innerHTML = '';

    Object.entries(expenseCategories).forEach(([category, amount]) => {
        const percentage = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <span class="category-name">${category}</span>
            <div>
                <span class="category-amount" style="color: var(--danger);">
                    ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
                </span>
                <span class="category-percentage">${percentage}%</span>
            </div>
        `;
        expenseContainer.appendChild(item);
    });
}

updateMonthlyTrend() {
    const monthlyData = this.getMonthlyData();
    const tbody = document.getElementById('monthlyTrendBody');
    tbody.innerHTML = '';

    monthlyData.forEach(month => {
        const row = document.createElement('tr');
        const trend = month.balance > 0 ? 'up' : month.balance < 0 ? 'down' : 'neutral';
        const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
        
        row.innerHTML = `
            <td>${month.month}</td>
            <td style="color: var(--success); font-weight: 600;">
                ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(month.income)}
            </td>
            <td style="color: var(--danger); font-weight: 600;">
                ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(month.expense)}
            </td>
            <td style="color: ${trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text)'}; font-weight: 600;">
                ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(month.balance)}
            </td>
            <td>
                <span class="trend-indicator trend-${trend}">
                    ${trendIcon} ${trend === 'up' ? 'Naik' : trend === 'down' ? 'Turun' : 'Stabil'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

getMonthlyData() {
    const monthlyData = {};
    
    this.transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthName,
                income: 0,
                expense: 0,
                balance: 0
            };
        }
        
        if (transaction.type === 'income') {
            monthlyData[monthKey].income += transaction.amount;
        } else if (transaction.type === 'expense') {
            monthlyData[monthKey].expense += transaction.amount;
        }
        
        monthlyData[monthKey].balance = monthlyData[monthKey].income - monthlyData[monthKey].expense;
    });

    // Convert to array and sort by date (newest first)
    return Object.values(monthlyData)
        .sort((a, b) => new Date(b.month) - new Date(a.month))
        .slice(0, 6); // Last 6 months
}

updateFinancialRatios(data) {
    const totalIncome = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestment = this.getTotalInvestment();

    // Calculate ratios
    const savingsRatio = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
    const investmentRatio = totalIncome > 0 ? (totalInvestment / totalIncome * 100).toFixed(1) : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome * 100).toFixed(1) : 0;

    // Emergency fund calculation (3x monthly expense)
    const monthlyExpense = this.getMonthlyAverageExpense();
    const emergencyFundMonths = monthlyExpense > 0 ? (totalInvestment / monthlyExpense).toFixed(1) : 0;

    document.getElementById('savingsRatio').textContent = `${savingsRatio}%`;
    document.getElementById('investmentRatio').textContent = `${investmentRatio}%`;
    document.getElementById('expenseRatio').textContent = `${expenseRatio}%`;
    document.getElementById('emergencyFund').textContent = `${emergencyFundMonths} bulan`;

    // Update colors based on ratios
    this.updateRatioColor('savingsRatio', savingsRatio, 20);
    this.updateRatioColor('investmentRatio', investmentRatio, 15);
    this.updateRatioColor('expenseRatio', expenseRatio, 60);
    this.updateRatioColor('emergencyFund', emergencyFundMonths, 3);
}

updateRatioColor(elementId, value, goodThreshold) {
    const element = document.getElementById(elementId);
    if (value >= goodThreshold) {
        element.style.color = 'var(--success)';
    } else if (value >= goodThreshold * 0.5) {
        element.style.color = 'var(--warning)';
    } else {
        element.style.color = 'var(--danger)';
    }
}

initReportChart() {
    const ctx = document.getElementById('reportChart').getContext('2d');
    
    if (this.reportChart) {
        this.reportChart.destroy();
    }

    this.reportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pemasukan', 'Pengeluaran', 'Investasi'],
            datasets: [{
                label: 'Jumlah (Rp)',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(239, 68, 68)',
                    'rgb(245, 158, 11)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Ringkasan Keuangan'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });

    this.updateReportChartData();
}

updateReportChartData() {
    const period = document.getElementById('reportPeriod').value;
    const data = this.filterDataByPeriod(period);

    const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestment = data.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);

    this.reportChart.data.datasets[0].data = [totalIncome, totalExpense, totalInvestment];
    this.reportChart.update();
}

switchReportChart(chartType) {
    // Update active tab
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');

    // Update chart based on type
    // This is a simplified version - you can expand this with different chart types
    this.updateReportChartData();
}

// Export functions (simplified versions)
exportPDF() {
    this.showNotification('Fitur export PDF akan segera hadir!', 'info');
}

exportExcel() {
    this.showNotification('Fitur export Excel akan segera hadir!', 'info');
}

getMonthlyAverageExpense() {
    const monthlyExpenses = {};
    
    this.transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const date = new Date(t.date);
            const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyExpenses[monthYear] = (monthlyExpenses[monthYear] || 0) + t.amount;
        });

    const months = Object.keys(monthlyExpenses);
    return months.length > 0 ? 
        Object.values(monthlyExpenses).reduce((a, b) => a + b, 0) / months.length : 0;
}
    // === MODAL METHODS ===
    showInvestmentModal() {
        this.closeAllModals();
        document.getElementById('investmentModal').style.display = 'block';
        this.updateInvestmentSummary();
    }

    closeInvestmentModal() {
        document.getElementById('investmentModal').style.display = 'none';
        document.getElementById('investmentForm').reset();
    }

    showBudgetModal() {
        this.closeAllModals();
        document.getElementById('budgetModal').style.display = 'block';
    }

    closeBudgetModal() {
        document.getElementById('budgetModal').style.display = 'none';
    }

    showReportModal() {
        this.closeAllModals();
        document.getElementById('reportModal').style.display = 'block';
    }

    closeReportModal() {
        document.getElementById('reportModal').style.display = 'none';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // === TRANSACTION METHODS ===
    addTransaction() {
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;

        if (!type || !category || !amount || !date) {
            this.showNotification('Harap isi semua field yang wajib!', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            type,
            category,
            amount,
            description,
            date
        };

        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.renderTransactions();
        this.updateSummary();
        this.updateCategoryFilter();
        this.resetForm();
        
        this.showNotification('Transaksi berhasil ditambahkan!', 'success');
    }

    deleteTransaction(id) {
        if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            this.transactions = this.transactions.filter(transaction => transaction.id !== id);
            this.saveToLocalStorage();
            this.renderTransactions();
            this.updateSummary();
            this.showNotification('Transaksi berhasil dihapus!', 'error');
        }
    }

    renderTransactions() {
        const tbody = document.getElementById('transactionList');
        tbody.innerHTML = '';

        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterCategory = document.getElementById('filterCategory').value;
        const filterType = document.getElementById('filterType').value;

        let filteredTransactions = this.transactions.filter(transaction => {
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                                transaction.category.toLowerCase().includes(searchTerm);
            const matchesCategory = !filterCategory || transaction.category === filterCategory;
            const matchesType = !filterType || transaction.type === filterType;
            
            return matchesSearch && matchesCategory && matchesType;
        });

        filteredTransactions = filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredTransactions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div>Tidak ada transaksi yang ditemukan</div>
            </td>`;
            tbody.appendChild(row);
            return;
        }

        filteredTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            const date = new Date(transaction.date).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const amount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
            }).format(transaction.amount);

            let typeBadge, amountClass;
            if (transaction.type === 'income') {
                typeBadge = '<span class="income-badge">Pemasukan</span>';
                amountClass = 'income-amount';
            } else if (transaction.type === 'investment') {
                typeBadge = '<span class="investment-badge">Investasi</span>';
                amountClass = 'investment-amount-display';
            } else {
                typeBadge = '<span class="expense-badge">Pengeluaran</span>';
                amountClass = 'expense-amount';
            }

            row.innerHTML = `
                <td>${date}</td>
                <td>${typeBadge}</td>
                <td>${transaction.category}</td>
                <td>${transaction.description}</td>
                <td class="${amountClass}">${amount}</td>
                <td>
                    <button class="delete-btn" onclick="moneyTracker.deleteTransaction(${transaction.id})">
                        Hapus
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // === INVESTMENT METHODS ===
    addInvestment() {
        const type = document.getElementById('investmentType').value;
        const name = document.getElementById('investmentName').value;
        const amount = parseFloat(document.getElementById('investmentAmount').value);
        const currentValue = parseFloat(document.getElementById('currentValue').value) || amount;
        const date = document.getElementById('investmentDate').value;

        if (!type || !name || !amount || !date) {
            this.showNotification('Harap isi semua field yang wajib!', 'error');
            return;
        }

        const investment = {
            id: Date.now(),
            type,
            name,
            initialAmount: amount,
            currentAmount: currentValue,
            date,
            createdAt: new Date().toISOString()
        };

        this.investments.push(investment);
        this.saveToLocalStorage();
        this.loadInvestments();
        this.updateSummary();
        this.updateInvestmentSummary();
        this.updateInvestmentChart();
        
        // Reset form
        document.getElementById('investmentForm').reset();
        document.getElementById('currentValue').value = '';
        
        this.showNotification('Investasi berhasil ditambahkan!', 'success');
    }

    deleteInvestment(id) {
        if (confirm('Apakah Anda yakin ingin menghapus investasi ini?')) {
            this.investments = this.investments.filter(investment => investment.id !== id);
            this.saveToLocalStorage();
            this.loadInvestments();
            this.updateSummary();
            this.updateInvestmentSummary();
            this.updateInvestmentChart();
            this.showNotification('Investasi berhasil dihapus!', 'error');
        }
    }

    updateInvestmentValue(id, newValue) {
        const investment = this.investments.find(inv => inv.id === id);
        if (investment) {
            const oldValue = investment.currentAmount;
            investment.currentAmount = parseFloat(newValue);
            investment.updatedAt = new Date().toISOString();
            this.saveToLocalStorage();
            this.loadInvestments();
            this.updateInvestmentSummary();
            this.updateInvestmentChart();
            
            const profit = investment.currentAmount - oldValue;
            this.showNotification(
                `Nilai investasi diperbarui! ${profit >= 0 ? '📈' : '📉'} ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(profit)}`,
                profit >= 0 ? 'success' : 'error'
            );
        }
    }

    loadInvestments() {
        const container = document.getElementById('investmentList');
        container.innerHTML = '';

        if (this.investments.length === 0) {
            container.innerHTML = `
                <div class="empty-investment">
                    <div class="empty-investment-icon">📈</div>
                    <div>Belum ada investasi</div>
                    <p style="margin-top: 10px; font-size: 0.9em; color: var(--text-light);">
                        Tambahkan investasi pertama Anda untuk mulai melacak portfolio
                    </p>
                </div>
            `;
            return;
        }

        this.investments.forEach(investment => {
            const profit = investment.currentAmount - investment.initialAmount;
            const returnPercentage = (profit / investment.initialAmount) * 100;
            
            const investmentElement = document.createElement('div');
            investmentElement.className = 'investment-item';
            investmentElement.innerHTML = `
                <div class="investment-info">
                    <div class="investment-name">${investment.name}</div>
                    <div class="investment-meta">
                        <span>${investment.type}</span>
                        <span>Mulai: ${new Date(investment.date).toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
                <div class="investment-amount">
                    <div class="investment-value">
                        ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(investment.currentAmount)}
                    </div>
                    <div class="investment-return ${returnPercentage >= 0 ? 'return-positive' : 'return-negative'}">
                        ${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%
                    </div>
                </div>
                <div class="investment-actions">
                    <button class="edit-btn" onclick="moneyTracker.editInvestmentValue(${investment.id})">
                        Edit
                    </button>
                    <button class="delete-btn" onclick="moneyTracker.deleteInvestment(${investment.id})">
                        Hapus
                    </button>
                </div>
            `;
            container.appendChild(investmentElement);
        });
    }

    editInvestmentValue(id) {
        const investment = this.investments.find(inv => inv.id === id);
        if (investment) {
            const newValue = prompt(
                `Edit nilai saat ini untuk ${investment.name}:`,
                investment.currentAmount
            );
            if (newValue && !isNaN(newValue)) {
                this.updateInvestmentValue(id, newValue);
            }
        }
    }

    updateInvestmentSummary() {
        const totalInitial = this.investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
        const totalCurrent = this.investments.reduce((sum, inv) => sum + inv.currentAmount, 0);
        const totalProfit = totalCurrent - totalInitial;
        const totalReturn = totalInitial > 0 ? (totalProfit / totalInitial) * 100 : 0;

        document.getElementById('portfolioTotal').textContent = 
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalCurrent);

        document.getElementById('portfolioGrowth').textContent = 
            `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;

        document.getElementById('portfolioProfit').textContent = 
            `(${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalProfit)})`;

        // Update colors based on performance
        const growthElement = document.getElementById('portfolioGrowth');
        const profitElement = document.getElementById('portfolioProfit');
        if (totalProfit >= 0) {
            growthElement.style.color = 'var(--success)';
            profitElement.style.color = 'var(--success)';
        } else {
            growthElement.style.color = 'var(--danger)';
            profitElement.style.color = 'var(--danger)';
        }
    }

    initInvestmentChart() {
        const ctx = document.getElementById('investmentChart').getContext('2d');
        this.investmentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
        this.updateInvestmentChart();
    }

    updateInvestmentChart() {
        if (!this.investmentChart) return;

        const types = {};
        this.investments.forEach(inv => {
            types[inv.type] = (types[inv.type] || 0) + inv.currentAmount;
        });

        this.investmentChart.data.labels = Object.keys(types);
        this.investmentChart.data.datasets[0].data = Object.values(types);
        this.investmentChart.update();
    }

    // === SUMMARY METHODS ===
    updateSummary() {
        const totalIncome = this.getTotalIncome();
        const totalExpense = this.getTotalExpense();
        const totalInvestment = this.getTotalInvestment();

        document.getElementById('totalIncome').textContent = 
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalIncome);

        document.getElementById('totalExpense').textContent = 
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalExpense);

        document.getElementById('totalInvestment').textContent = 
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalInvestment);
    }

    getTotalIncome() {
        return this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    getTotalExpense() {
        return this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    getTotalInvestment() {
        const transactionInvestment = this.transactions
            .filter(t => t.type === 'investment')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const portfolioInvestment = this.investments
            .reduce((sum, inv) => sum + inv.initialAmount, 0);
            
        return transactionInvestment + portfolioInvestment;
    }

    // === UTILITY METHODS ===
    updateCategoryFilter() {
        const filterSelect = document.getElementById('filterCategory');
        const categories = [...new Set(this.transactions.map(t => t.category))];
        
        filterSelect.innerHTML = '<option value="">Semua Kategori</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    resetForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDates();
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('investmentDate').value = today;
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('investments', JSON.stringify(this.investments));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: var(--success);' : ''}
            ${type === 'error' ? 'background: var(--danger);' : ''}
            ${type === 'info' ? 'background: var(--primary);' : ''}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inisialisasi aplikasi
const moneyTracker = new MoneyTracker();
