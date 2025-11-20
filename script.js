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