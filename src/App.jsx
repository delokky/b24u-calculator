import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const B24UCalculator = () => {
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('results'); // 'results', 'whatif', 'goal'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const resultsRef = useRef(null);
  
  // Input parameters
  const [avgPrice, setAvgPrice] = useState('');
  const [firstMonthClients, setFirstMonthClients] = useState('');
  const [growthType, setGrowthType] = useState('');
  const [customGrowth, setCustomGrowth] = useState('');
  const [churnRate, setChurnRate] = useState('');
  const [cacValue, setCAC] = useState('');
  const [opex, setOpex] = useState('');
  
  // What-if parameters (deltas from original)
  const [whatIfPriceDelta, setWhatIfPriceDelta] = useState(0);
  const [whatIfChurnDelta, setWhatIfChurnDelta] = useState(0);
  const [whatIfClientsDelta, setWhatIfClientsDelta] = useState(0);
  const [whatIfCACDelta, setWhatIfCACDelta] = useState(0);
  
  // Goal mode
  const [targetRevenue, setTargetRevenue] = useState('1000000');
  const [targetMonth, setTargetMonth] = useState('6');
  
  const questions = [
    {
      id: 'price',
      question: 'Цена продажи одного чата в месяц?',
      hint: 'Обычно 10,000-50,000₽',
      placeholder: '15000'
    },
    {
      id: 'first-month',
      question: 'Новых клиентов в первый месяц?',
      hint: 'Реалистичная цель — 10-20',
      placeholder: '10'
    },
    {
      id: 'growth',
      question: 'Как будет расти количество клиентов?',
      type: 'growth'
    },
    {
      id: 'churn',
      question: 'Процент оттока клиентов?',
      hint: 'По рынку SaaS: 5-15%',
      placeholder: '10'
    },
    {
      id: 'cac',
      question: 'Стоимость привлечения клиента (CAC)?',
      hint: 'Диапазон 500-3000₽',
      placeholder: '1500'
    },
    {
      id: 'opex',
      question: 'Операционные расходы в месяц?',
      hint: 'Зарплаты, офис, реклама',
      placeholder: '50000'
    }
  ];
  
  const getCurrentValue = () => {
    switch(step) {
      case 0: return avgPrice;
      case 1: return firstMonthClients;
      case 2: return growthType;
      case 3: return churnRate;
      case 4: return cacValue;
      case 5: return opex;
      default: return '';
    }
  };
  
  const updateCurrentValue = (value) => {
    switch(step) {
      case 0: setAvgPrice(value); break;
      case 1: setFirstMonthClients(value); break;
      case 2: setGrowthType(value); break;
      case 3: setChurnRate(value); break;
      case 4: setCAC(value); break;
      case 5: setOpex(value); break;
    }
  };
  
  const canProceed = () => {
    const value = getCurrentValue();
    if (step === 2) {
      return growthType !== '' && (growthType === 'custom' ? customGrowth !== '' : true);
    }
    // Allow 0 for churn (step 3), CAC (step 4) and opex (step 5)
    if (step === 3 || step === 4 || step === 5) {
      return value !== '';
    }
    // For price (step 0) and clients (step 1) require positive values
    return value !== '' && parseInt(value) > 0;
  };
  
  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && canProceed()) {
      handleNext();
    }
  };
  
  // Handle keyboard navigation for growth step
  const handleGrowthKeyPress = (e) => {
    if (e.key === 'Enter' && step === 2 && canProceed()) {
      handleNext();
    }
  };
  
  // Add keyboard listener for Enter on all steps
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !showResults && canProceed()) {
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, showResults, avgPrice, firstMonthClients, growthType, customGrowth, churnRate, cacValue, opex]);
  
  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showExportMenu && !e.target.closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);
  
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  const handleReset = () => {
    setStep(0);
    setShowResults(false);
    setActiveTab('results');
    setAvgPrice('');
    setFirstMonthClients('');
    setGrowthType('');
    setCustomGrowth('');
    setChurnRate('');
    setCAC('');
    setOpex('');
    setWhatIfPriceDelta(0);
    setWhatIfChurnDelta(0);
    setWhatIfClientsDelta(0);
    setWhatIfCACDelta(0);
  };
  
  const getMonthlyClients = (month, clientsDelta = 0) => {
    const firstMonth = parseInt(firstMonthClients) + clientsDelta;
    if (month === 1) return firstMonth;
    
    let growth = 0;
    if (growthType === 'stable') return firstMonth;
    else if (growthType === 'moderate') growth = 10;
    else if (growthType === 'aggressive') growth = 20;
    else if (growthType === 'very-aggressive') growth = 30;
    else if (growthType === 'custom') growth = parseInt(customGrowth);
    
    return Math.round(firstMonth * Math.pow(1 + growth / 100, month - 1));
  };
  
  const calculateMetrics = (priceOverride = null, churnOverride = null, clientsOverride = null, cacOverride = null) => {
    const data = [];
    let activeClients = 0;
    let cumulativeRevenue = 0;
    let cumulativeProfit = 0;
    let totalInvestment = 0;
    
    const price = priceOverride !== null ? priceOverride : parseInt(avgPrice);
    const churn = churnOverride !== null ? churnOverride : parseFloat(churnRate);
    const cac = cacOverride !== null ? cacOverride : parseInt(cacValue);
    const clientsDelta = clientsOverride !== null ? clientsOverride : 0;
    const monthlyOpex = parseInt(opex) || 0;
    
    for (let month = 1; month <= 12; month++) {
      const newClients = getMonthlyClients(month, clientsDelta);
      const churnedClients = Math.round(activeClients * (churn / 100));
      activeClients = activeClients + newClients - churnedClients;
      
      const mrr = activeClients * price;
      const partnerRevenue = mrr * 0.5;
      const acquisitionCost = newClients * cac;
      const totalCosts = acquisitionCost + monthlyOpex;
      const profit = partnerRevenue - totalCosts;
      
      cumulativeRevenue += partnerRevenue;
      cumulativeProfit += profit;
      totalInvestment += totalCosts;
      
      const avgLifetimeMonths = churn > 0 ? 100 / churn : 100;
      const ltv = price * avgLifetimeMonths * 0.5;
      const ltvCacRatio = cac > 0 ? ltv / cac : 0;
      
      data.push({
        month: `М${month}`,
        monthNum: month,
        monthName: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][month - 1],
        newClients,
        churnedClients,
        activeClients,
        mrr,
        partnerRevenue,
        cumulativeRevenue,
        acquisitionCost,
        monthlyOpex,
        totalCosts,
        profit,
        cumulativeProfit,
        ltv,
        ltvCacRatio,
        totalInvestment
      });
    }
    
    return data;
  };
  
  // Calculate goal requirements
  const calculateGoalRequirements = () => {
    const target = parseInt(targetRevenue);
    const months = parseInt(targetMonth);
    const price = parseInt(avgPrice);
    const churn = parseFloat(churnRate);
    const cac = parseInt(cacValue);
    const monthlyOpex = parseInt(opex) || 0;
    
    // Binary search to find required monthly clients
    let low = 1, high = 200, result = null;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testData = calculateMetrics(price, churn, mid - parseInt(firstMonthClients), cac);
      
      if (testData[months - 1].partnerRevenue >= target) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    
    return {
      requiredClients: result,
      targetRevenue: target,
      targetMonth: months
    };
  };
  
  const metricsData = useMemo(() => {
    if (!showResults) return [];
    return calculateMetrics();
  }, [showResults, avgPrice, firstMonthClients, growthType, customGrowth, churnRate, cacValue, opex]);
  
  const whatIfData = useMemo(() => {
    if (!showResults || activeTab !== 'whatif') return [];
    const newPrice = Math.max(10000, Math.min(100000, parseInt(avgPrice) + whatIfPriceDelta));
    const newChurn = Math.max(0, Math.min(50, parseFloat(churnRate) + whatIfChurnDelta));
    const newCAC = Math.max(0, Math.min(15000, parseInt(cacValue) + whatIfCACDelta));
    const newClients = Math.max(1, whatIfClientsDelta);
    return calculateMetrics(newPrice, newChurn, newClients, newCAC);
  }, [showResults, activeTab, avgPrice, churnRate, cacValue, whatIfPriceDelta, whatIfChurnDelta, whatIfClientsDelta, whatIfCACDelta, firstMonthClients, growthType, customGrowth, opex]);
  
  const goalRequirements = useMemo(() => {
    if (!showResults || activeTab !== 'goal') return null;
    return calculateGoalRequirements();
  }, [showResults, activeTab, targetRevenue, targetMonth, avgPrice, churnRate, cacValue, opex, firstMonthClients, growthType, customGrowth]);
  
  const formatMoney = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatNumber = (value) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };
  
  const exportToPDF = async () => {
    // Dynamic import of html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Create a clean version for PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'background: white; padding: 40px; font-family: Arial, sans-serif; color: black;';
    
    // Add header
    pdfContainer.innerHTML = `
      <div style="margin-bottom: 20px; border-bottom: 3px solid #22d3ee; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e293b;">B24U Калькулятор Бизнеса Дистрибьютора</h1>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Прогноз на 12 месяцев • ${new Date().toLocaleDateString('ru-RU')}</p>
      </div>
      
      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 2px solid #22d3ee; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b; font-weight: bold;">📋 ИСХОДНЫЕ ПАРАМЕТРЫ</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px;">
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">Цена продажи:</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${formatMoney(parseInt(avgPrice))}</strong>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">Клиентов (старт):</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${firstMonthClients} шт</strong>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">Стратегия роста:</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${
              growthType === 'stable' ? 'Стабильный' :
              growthType === 'moderate' ? '+10%/мес' :
              growthType === 'aggressive' ? '+20%/мес' :
              growthType === 'very-aggressive' ? '+30%/мес' :
              `+${customGrowth}%/мес`
            }</strong>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">Churn Rate:</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${churnRate}%</strong>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">CAC:</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${formatMoney(parseInt(cacValue))}</strong>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px;">
            <span style="color: #64748b;">Opex (мес):</span><br>
            <strong style="font-size: 13px; color: #1e293b;">${formatMoney(parseInt(opex) || 0)}</strong>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #22d3ee;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">MRR (месяц 12)</div>
          <div style="font-size: 16px; font-weight: bold; color: #1e293b;">${formatMoney(metricsData[11].mrr)}</div>
          <div style="font-size: 9px; color: #22d3ee; margin-top: 3px;">${metricsData[11].activeClients} клиентов</div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #22d3ee;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">ВАШ ДОХОД</div>
          <div style="font-size: 16px; font-weight: bold; color: #22d3ee;">${formatMoney(metricsData[11].partnerRevenue)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">50% от MRR</div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #a855f7;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">ДО 500K</div>
          <div style="font-size: 16px; font-weight: bold; color: #a855f7;">${monthTo500K ? `М${monthTo500K}` : '>12'}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">${monthTo500K ? 'Достижимо' : 'Долго'}</div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid ${metricsData[11].cumulativeProfit >= 0 ? '#22c55e' : '#ef4444'};">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">ПРИБЫЛЬ ГОД</div>
          <div style="font-size: 16px; font-weight: bold; color: ${metricsData[11].cumulativeProfit >= 0 ? '#22c55e' : '#ef4444'};">${formatMoney(metricsData[11].cumulativeProfit)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">За 12 месяцев</div>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px;">
        <thead>
          <tr style="background: #1e293b; color: white;">
            <th style="padding: 10px; text-align: left; border: 1px solid #cbd5e1;">Месяц</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Новые</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Отток</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">База</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">MRR</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Доход</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Прибыль</th>
          </tr>
        </thead>
        <tbody>
          ${metricsData.map((row, idx) => `
            <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : 'white'};">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">${row.monthName}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #22c55e;">${row.newClients}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #ef4444;">${row.churnedClients}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${row.activeClients}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatMoney(row.mrr)}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #22d3ee;">${formatMoney(row.partnerRevenue)}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: ${row.profit >= 0 ? '#22c55e' : '#ef4444'};">${formatMoney(row.profit)}</td>
            </tr>
          `).join('')}
          <tr style="background: #1e293b; color: white; font-weight: bold;">
            <td style="padding: 10px; border: 1px solid #cbd5e1;">ИТОГО</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${metricsData.reduce((s, r) => s + r.newClients, 0)}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${metricsData.reduce((s, r) => s + r.churnedClients, 0)}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${metricsData[11].activeClients}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(metricsData[11].mrr)}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(metricsData[11].cumulativeRevenue)}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(metricsData[11].cumulativeProfit)}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">LTV КЛИЕНТА</div>
          <div style="font-size: 16px; font-weight: bold;">${formatMoney(metricsData[11].ltv)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">${Math.round(100/parseFloat(churnRate))} мес жизни</div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">LTV/CAC RATIO</div>
          <div style="font-size: 16px; font-weight: bold; color: ${metricsData[11].ltvCacRatio >= 3 ? '#22c55e' : '#f59e0b'};">${metricsData[11].ltvCacRatio.toFixed(1)}x</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">${metricsData[11].ltvCacRatio >= 3 ? '✓ Отлично' : '⚠ Улучшить'}</div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">RETENTION</div>
          <div style="font-size: 16px; font-weight: bold;">${100 - parseFloat(churnRate)}%</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Удержание</div>
        </div>
      </div>
      
      <div style="margin-top: 15px; text-align: center; color: #94a3b8; font-size: 9px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
        B24U Калькулятор Бизнеса Дистрибьютора | Сгенерировано ${new Date().toLocaleDateString('ru-RU')}
      </div>
    `;
    
    // PDF options
    const opt = {
      margin: 15,
      filename: `b24u-calculator-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    try {
      // Generate PDF
      await html2pdf().set(opt).from(pdfContainer).save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Ошибка при создании PDF. Попробуйте ещё раз.');
    }
  };
  
  const downloadPDF = async () => {
    // Alternative: Direct PDF download using browser's print-to-PDF
    // This opens the print dialog with PDF as default
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(document.documentElement.outerHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      // Fallback to regular print
      window.print();
    }
  };
  
  const exportToGoogleSheets = () => {
    // Create CSV data
    const headers = ['Месяц', 'Новые клиенты', 'Отток', 'Активная база', 'MRR', 'Ваш доход', 'Расходы', 'Прибыль'];
    const rows = metricsData.map(row => [
      row.monthName,
      row.newClients,
      row.churnedClients,
      row.activeClients,
      row.mrr,
      row.partnerRevenue,
      row.totalCosts,
      row.profit
    ]);
    
    // Add summary row
    const lastMonth = metricsData[metricsData.length - 1];
    rows.push([
      'ИТОГО',
      metricsData.reduce((s, r) => s + r.newClients, 0),
      metricsData.reduce((s, r) => s + r.churnedClients, 0),
      lastMonth.activeClients,
      lastMonth.mrr,
      lastMonth.cumulativeRevenue,
      lastMonth.totalInvestment,
      lastMonth.cumulativeProfit
    ]);
    
    // Add parameters section
    rows.push([]);
    rows.push(['ПАРАМЕТРЫ']);
    rows.push(['Цена продажи', parseInt(avgPrice) + ' ₽']);
    rows.push(['Клиентов в 1 месяц', firstMonthClients]);
    rows.push(['Стратегия роста', 
      growthType === 'stable' ? 'Стабильный' :
      growthType === 'moderate' ? 'Умеренный +10%' :
      growthType === 'aggressive' ? 'Агрессивный +20%' :
      growthType === 'very-aggressive' ? 'Очень агрессивный +30%' :
      `Свой +${customGrowth}%`
    ]);
    rows.push(['Churn Rate', churnRate + '%']);
    rows.push(['CAC', parseInt(cacValue) + ' ₽']);
    rows.push(['Операционные расходы', (parseInt(opex) || 0) + ' ₽']);
    
    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `b24u-calculator-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToExcel = () => {
    // Create HTML table
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>B24U Калькулятор</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
        </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <tr><th colspan="8" style="font-size: 16px; font-weight: bold;">B24U Калькулятор Бизнеса Дистрибьютора</th></tr>
          <tr><th colspan="8"></th></tr>
          <tr>
            <th>Месяц</th>
            <th>Новые клиенты</th>
            <th>Отток</th>
            <th>Активная база</th>
            <th>MRR</th>
            <th>Ваш доход</th>
            <th>Расходы</th>
            <th>Прибыль</th>
          </tr>
    `;
    
    metricsData.forEach(row => {
      html += `
        <tr>
          <td>${row.monthName}</td>
          <td>${row.newClients}</td>
          <td>${row.churnedClients}</td>
          <td>${row.activeClients}</td>
          <td>${row.mrr}</td>
          <td>${row.partnerRevenue}</td>
          <td>${row.totalCosts}</td>
          <td>${row.profit}</td>
        </tr>
      `;
    });
    
    const lastMonth = metricsData[metricsData.length - 1];
    html += `
      <tr style="font-weight: bold; background-color: #f0f0f0;">
        <td>ИТОГО</td>
        <td>${metricsData.reduce((s, r) => s + r.newClients, 0)}</td>
        <td>${metricsData.reduce((s, r) => s + r.churnedClients, 0)}</td>
        <td>${lastMonth.activeClients}</td>
        <td>${lastMonth.mrr}</td>
        <td>${lastMonth.cumulativeRevenue}</td>
        <td>${lastMonth.totalInvestment}</td>
        <td>${lastMonth.cumulativeProfit}</td>
      </tr>
      <tr><td colspan="8"></td></tr>
      <tr style="font-weight: bold;"><td colspan="8">ПАРАМЕТРЫ</td></tr>
      <tr><td>Цена продажи</td><td colspan="7">${parseInt(avgPrice)} ₽</td></tr>
      <tr><td>Клиентов в 1 месяц</td><td colspan="7">${firstMonthClients}</td></tr>
      <tr><td>Стратегия роста</td><td colspan="7">${
        growthType === 'stable' ? 'Стабильный' :
        growthType === 'moderate' ? 'Умеренный +10%' :
        growthType === 'aggressive' ? 'Агрессивный +20%' :
        growthType === 'very-aggressive' ? 'Очень агрессивный +30%' :
        `Свой +${customGrowth}%`
      }</td></tr>
      <tr><td>Churn Rate</td><td colspan="7">${churnRate}%</td></tr>
      <tr><td>CAC</td><td colspan="7">${parseInt(cacValue)} ₽</td></tr>
      <tr><td>Операционные расходы</td><td colspan="7">${parseInt(opex) || 0} ₽</td></tr>
    </table>
    </body>
    </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `b24u-calculator-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!showResults) {
    const currentQ = questions[step];
    const progress = ((step + 1) / questions.length) * 100;
    
    return (
      <div className="min-h-screen bg-slate-900 p-4 sm:p-8 flex items-center justify-center">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Manrope:wght@400;600;700;800&display=swap');
          
          * {
            font-family: 'Manrope', sans-serif;
          }
          
          .mono {
            font-family: 'JetBrains Mono', monospace;
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-slide-up {
            animation: slideUp 0.4s ease-out forwards;
          }
          
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .bg-slate-900 { background: white !important; color: black !important; }
            .bg-slate-800 { background: #f8f9fa !important; }
            .text-white { color: black !important; }
            .text-slate-400, .text-slate-500, .text-slate-600 { color: #666 !important; }
            .border-slate-700 { border-color: #ddd !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .metric-card { break-inside: avoid; }
            
            @page {
              margin: 1.5cm;
            }
          }
        `}</style>
        
        <div className="max-w-xl w-full animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 px-4 py-1.5 rounded-full text-sm font-bold mb-4 mono">
              B24U КАЛЬКУЛЯТОР
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {currentQ.question}
            </div>
            {currentQ.hint && (
              <div className="text-slate-400 text-sm">{currentQ.hint}</div>
            )}
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Шаг {step + 1}/{questions.length}</span>
              <span className="mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="mb-6">
            {currentQ.type === 'growth' ? (
              <div className="space-y-2">
                {[
                  { value: 'stable', label: 'Стабильный', desc: 'Одинаково каждый месяц' },
                  { value: 'moderate', label: '+10%', desc: 'Умеренный рост' },
                  { value: 'aggressive', label: '+20%', desc: 'Агрессивный рост' },
                  { value: 'very-aggressive', label: '+30%', desc: 'Очень агрессивный' },
                  { value: 'custom', label: 'Свой %', desc: 'Указать процент' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGrowthType(option.value)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      growthType === option.value
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className={`text-xs ${growthType === option.value ? 'text-slate-900/70' : 'text-slate-400'}`}>
                      {option.desc}
                    </div>
                  </button>
                ))}
                
                {growthType === 'custom' && (
                  <input
                    type="number"
                    value={customGrowth}
                    onChange={(e) => setCustomGrowth(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Процент роста"
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-cyan-400 rounded-lg text-white placeholder-slate-500 focus:outline-none mono text-lg"
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <input
                type="number"
                value={getCurrentValue()}
                onChange={(e) => updateCurrentValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentQ.placeholder}
                className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors mono text-2xl text-center"
                autoFocus
              />
            )}
          </div>
          
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                ←
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
                canProceed()
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 hover:shadow-lg hover:shadow-cyan-500/50'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {step === questions.length - 1 ? 'Рассчитать →' : 'Далее →'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Results view
  const currentData = activeTab === 'whatif' ? whatIfData : metricsData;
  const lastMonth = currentData[currentData.length - 1];
  const monthTo500K = currentData.find(d => d.partnerRevenue >= 500000)?.monthNum || null;
  const monthTo1M = currentData.find(d => d.partnerRevenue >= 1000000)?.monthNum || null;
  const breakEvenMonth = currentData.find(d => d.cumulativeProfit >= 0)?.monthNum || null;
  
  // Calculate what-if impact
  const whatIfImpact = activeTab === 'whatif' ? {
    revenueDiff: lastMonth.partnerRevenue - metricsData[11].partnerRevenue,
    profitDiff: lastMonth.cumulativeProfit - metricsData[11].cumulativeProfit,
    clientsDiff: lastMonth.activeClients - metricsData[11].activeClients
  } : null;
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Manrope:wght@400;600;700;800&display=swap');
        
        * {
          font-family: 'Manrope', sans-serif;
        }
        
        .mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .metric-card {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .metric-card:nth-child(1) { animation-delay: 0.05s; }
        .metric-card:nth-child(2) { animation-delay: 0.1s; }
        .metric-card:nth-child(3) { animation-delay: 0.15s; }
        .metric-card:nth-child(4) { animation-delay: 0.2s; }
        
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .bg-slate-900 { background: white !important; color: black !important; }
          .text-white { color: black !important; }
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto" ref={resultsRef}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6 no-print">
          <div>
            <div className="inline-block bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 px-3 py-1 rounded-full text-xs font-bold mb-2 mono">
              ПРОГНОЗ НА ГОД
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-1">Ваш бизнес-план</h1>
            <p className="text-slate-400 text-sm">12 месяцев роста</p>
          </div>
          <div className="flex gap-2">
            <div className="relative export-menu">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                📊 Экспорт
                <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-semibold text-white">PDF</div>
                      <div className="text-xs text-slate-400">Печать в PDF</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-t border-slate-700"
                  >
                    <span className="text-xl">📊</span>
                    <div>
                      <div className="font-semibold text-white">Excel</div>
                      <div className="text-xs text-slate-400">Файл .xls</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToGoogleSheets();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-t border-slate-700"
                  >
                    <span className="text-xl">📈</span>
                    <div>
                      <div className="font-semibold text-white">CSV</div>
                      <div className="text-xs text-slate-400">Для Google Sheets</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-all"
            >
              ← Изменить
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 no-print">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'results'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📊 Результаты
          </button>
          <button
            onClick={() => setActiveTab('whatif')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'whatif'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🎯 Что если?
          </button>
          <button
            onClick={() => setActiveTab('goal')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'goal'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🚀 Цель
          </button>
        </div>
        
        {/* What-if Mode */}
        {activeTab === 'whatif' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold mb-2">🎯 Экспериментируйте с параметрами</h3>
              <p className="text-sm text-slate-300">Измените параметры и увидите как это повлияет на ваш доход</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Цена продажи</label>
                  <span className="text-cyan-400 mono">{formatMoney(Math.max(10000, Math.min(100000, parseInt(avgPrice) + whatIfPriceDelta)))}</span>
                </div>
                <input
                  type="range"
                  min={10000 - parseInt(avgPrice)}
                  max={100000 - parseInt(avgPrice)}
                  step="1000"
                  value={whatIfPriceDelta}
                  onChange={(e) => setWhatIfPriceDelta(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>10,000₽</span>
                  <span className={whatIfPriceDelta > 0 ? 'text-green-400' : whatIfPriceDelta < 0 ? 'text-red-400' : 'text-slate-500'}>
                    {whatIfPriceDelta > 0 ? '+' : ''}{formatMoney(whatIfPriceDelta)}
                  </span>
                  <span>100,000₽</span>
                </div>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Churn Rate</label>
                  <span className="text-cyan-400 mono">{Math.max(0, Math.min(50, parseFloat(churnRate) + whatIfChurnDelta)).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={-parseFloat(churnRate)}
                  max={50 - parseFloat(churnRate)}
                  step="0.5"
                  value={whatIfChurnDelta}
                  onChange={(e) => setWhatIfChurnDelta(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span className={whatIfChurnDelta < 0 ? 'text-green-400' : whatIfChurnDelta > 0 ? 'text-red-400' : 'text-slate-500'}>
                    {whatIfChurnDelta > 0 ? '+' : ''}{whatIfChurnDelta.toFixed(1)}%
                  </span>
                  <span>50%</span>
                </div>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Новых клиентов/мес</label>
                  <span className="text-cyan-400 mono">{Math.max(1, parseInt(firstMonthClients) + whatIfClientsDelta)}</span>
                </div>
                <input
                  type="range"
                  min={1 - parseInt(firstMonthClients)}
                  max="100"
                  step="1"
                  value={whatIfClientsDelta}
                  onChange={(e) => setWhatIfClientsDelta(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1</span>
                  <span className={whatIfClientsDelta > 0 ? 'text-green-400' : whatIfClientsDelta < 0 ? 'text-red-400' : 'text-slate-500'}>
                    {whatIfClientsDelta > 0 ? '+' : ''}{whatIfClientsDelta}
                  </span>
                  <span>+100</span>
                </div>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">CAC</label>
                  <span className="text-cyan-400 mono">{formatMoney(Math.max(0, Math.min(15000, parseInt(cacValue) + whatIfCACDelta)))}</span>
                </div>
                <input
                  type="range"
                  min={-parseInt(cacValue)}
                  max={15000 - parseInt(cacValue)}
                  step="100"
                  value={whatIfCACDelta}
                  onChange={(e) => setWhatIfCACDelta(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0₽</span>
                  <span className={whatIfCACDelta < 0 ? 'text-green-400' : whatIfCACDelta > 0 ? 'text-red-400' : 'text-slate-500'}>
                    {whatIfCACDelta > 0 ? '+' : ''}{formatMoney(whatIfCACDelta)}
                  </span>
                  <span>15,000₽</span>
                </div>
              </div>
            </div>
            
            {/* Impact Summary */}
            {whatIfImpact && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1 mono">ИЗМЕНЕНИЕ ДОХОДА</div>
                  <div className={`text-2xl font-bold mono ${whatIfImpact.revenueDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {whatIfImpact.revenueDiff >= 0 ? '+' : ''}{formatMoney(whatIfImpact.revenueDiff)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">За 12 месяцев</div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1 mono">ИЗМЕНЕНИЕ ПРИБЫЛИ</div>
                  <div className={`text-2xl font-bold mono ${whatIfImpact.profitDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {whatIfImpact.profitDiff >= 0 ? '+' : ''}{formatMoney(whatIfImpact.profitDiff)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">За год</div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1 mono">КЛИЕНТСКАЯ БАЗА</div>
                  <div className={`text-2xl font-bold mono ${whatIfImpact.clientsDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {whatIfImpact.clientsDiff >= 0 ? '+' : ''}{whatIfImpact.clientsDiff}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Изменение</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Goal Mode */}
        {activeTab === 'goal' && goalRequirements && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold mb-2">🚀 Обратный расчёт к цели</h3>
              <p className="text-sm text-slate-300">Укажите желаемый доход и срок — узнайте что нужно делать</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <label className="text-sm font-semibold mb-2 block">Целевой доход в месяц</label>
                <input
                  type="number"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-lg text-white mono text-xl focus:outline-none focus:border-cyan-400"
                  placeholder="1000000"
                />
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <label className="text-sm font-semibold mb-2 block">За сколько месяцев?</label>
                <input
                  type="number"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-lg text-white mono text-xl focus:outline-none focus:border-cyan-400"
                  placeholder="6"
                  min="1"
                  max="12"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-400 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 text-cyan-400">📋 Что нужно сделать:</h3>
              
              {goalRequirements.requiredClients ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold mono text-white">{goalRequirements.requiredClients}</span>
                    <span className="text-slate-400">новых клиентов в первый месяц</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="text-xs text-slate-500 mono mb-1">ТЕКУЩИЙ ПЛАН</div>
                      <div className="text-2xl font-bold">{firstMonthClients} клиентов</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="text-xs text-slate-500 mono mb-1">НУЖНО ДОБАВИТЬ</div>
                      <div className="text-2xl font-bold text-orange-400">+{goalRequirements.requiredClients - parseInt(firstMonthClients)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-cyan-400/10 border border-cyan-400/30 rounded-lg">
                    <div className="text-sm text-cyan-300">
                      💡 <strong>Совет:</strong> При текущих параметрах (цена {formatMoney(parseInt(avgPrice))}, churn {churnRate}%, рост {growthType}) 
                      вам нужно начать с {goalRequirements.requiredClients} клиентов, чтобы выйти на доход {formatMoney(goalRequirements.targetRevenue)} 
                      через {goalRequirements.targetMonth} {goalRequirements.targetMonth === 1 ? 'месяц' : goalRequirements.targetMonth < 5 ? 'месяца' : 'месяцев'}.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">😔</div>
                  <div className="text-xl font-semibold mb-2">Цель недостижима</div>
                  <div className="text-slate-400">
                    При текущих параметрах достичь {formatMoney(parseInt(targetRevenue))} за {targetMonth} мес невозможно.
                    Попробуйте увеличить срок или улучшить параметры (цена, churn, рост).
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Results Mode - Show metrics and charts */}
        {activeTab === 'results' && (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="metric-card bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1 mono">MRR (М12)</div>
                <div className="text-2xl font-bold mono">{formatMoney(lastMonth.mrr)}</div>
                <div className="text-xs text-cyan-400 mt-1">{formatNumber(lastMonth.activeClients)} клиентов</div>
              </div>
              
              <div className="metric-card bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1 mono">ВАШ ДОХОД</div>
                <div className="text-2xl font-bold text-cyan-400 mono">{formatMoney(lastMonth.partnerRevenue)}</div>
                <div className="text-xs text-slate-400 mt-1">50% от MRR</div>
              </div>
              
              <div className="metric-card bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1 mono">ДО 500K</div>
                <div className="text-2xl font-bold text-purple-400 mono">
                  {monthTo500K ? `М${monthTo500K}` : '>12'}
                </div>
                <div className="text-xs text-slate-400 mt-1">{monthTo500K ? 'Достижимо' : 'Долго'}</div>
              </div>
              
              <div className="metric-card bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1 mono">ПРИБЫЛЬ</div>
                <div className={`text-2xl font-bold mono ${lastMonth.cumulativeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(lastMonth.cumulativeProfit)}
                </div>
                <div className="text-xs text-slate-400 mt-1">За год</div>
              </div>
            </div>
          </>
        )}
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3 text-slate-300">
              {activeTab === 'whatif' ? 'НОВЫЙ ПРОГНОЗ ДОХОДА' : 'РОСТ ДОХОДА'}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={currentData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthName" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${Math.round(v/1000)}K`} style={{ fontSize: '11px' }} />
                <Tooltip 
                  formatter={(value) => formatMoney(value)}
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="partnerRevenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revenue)" />
                {activeTab === 'whatif' && (
                  <Line type="monotone" data={metricsData} dataKey="partnerRevenue" stroke="#64748b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3 text-slate-300">КЛИЕНТСКАЯ БАЗА</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthName" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="newClients" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churnedClients" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Compact Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-3 text-xs font-bold text-slate-400 mono">МЕС</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-400 mono">НОВЫЕ</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-400 mono">БАЗА</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-400 mono">MRR</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-400 mono">ДОХОД</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-400 mono">ПРИБЫЛЬ</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-3 font-semibold">{row.monthName}</td>
                    <td className="p-3 text-right text-green-400 mono">+{row.newClients}</td>
                    <td className="p-3 text-right mono">{row.activeClients}</td>
                    <td className="p-3 text-right text-cyan-400 mono">{formatMoney(row.mrr)}</td>
                    <td className="p-3 text-right font-semibold mono">{formatMoney(row.partnerRevenue)}</td>
                    <td className={`p-3 text-right mono ${row.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatMoney(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 border-t-2 border-cyan-400">
                <tr>
                  <td className="p-3 font-bold">ИТОГО</td>
                  <td className="p-3 text-right font-bold text-green-400 mono">
                    {currentData.reduce((s, r) => s + r.newClients, 0)}
                  </td>
                  <td className="p-3 text-right font-bold mono">{lastMonth.activeClients}</td>
                  <td className="p-3 text-right font-bold text-cyan-400 mono">{formatMoney(lastMonth.mrr)}</td>
                  <td className="p-3 text-right font-bold mono">{formatMoney(lastMonth.cumulativeRevenue)}</td>
                  <td className={`p-3 text-right font-bold mono ${lastMonth.cumulativeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(lastMonth.cumulativeProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {/* Bottom Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 mono">LTV КЛИЕНТА</div>
            <div className="text-2xl font-bold mono">{formatMoney(lastMonth.ltv)}</div>
            <div className="text-xs text-slate-400 mt-1">{Math.round(100/parseFloat(churnRate))} мес жизни</div>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 mono">LTV/CAC</div>
            <div className={`text-2xl font-bold mono ${lastMonth.ltvCacRatio >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
              {lastMonth.ltvCacRatio.toFixed(1)}x
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {lastMonth.ltvCacRatio >= 3 ? '✓ Отлично' : '⚠ Улучшить'}
            </div>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1 mono">RETENTION</div>
            <div className="text-2xl font-bold mono">{100 - parseFloat(churnRate)}%</div>
            <div className="text-xs text-slate-400 mt-1">Churn {churnRate}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default B24UCalculator;
