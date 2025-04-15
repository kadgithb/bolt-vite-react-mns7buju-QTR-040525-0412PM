import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, BarChart3, PieChart, TrendingUp, EyeOff, Eye, Calendar, ChevronDown, ChevronUp, Search, Menu, X, ArrowRightLeft } from 'lucide-react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface ExcelData {
  Date: string;
  Payee: string;
  Category: string;
  Amount: string | number;
  Tag: string;
  Group: string;
}

interface CategoryTotal {
  annual: number;
  monthly: number;
  weekly: number;
}

interface CategoryAnalysis {
  [category: string]: {
    [year: string]: CategoryTotal;
    average: CategoryTotal;
  };
}

interface GroupCategories {
  [group: string]: string[];
}

interface GroupTotal extends CategoryTotal {
  categories: string[];
}

interface GroupAnalysis {
  [group: string]: {
    [year: string]: GroupTotal;
    average: GroupTotal;
  };
}

interface TimeRange {
  id: string;
  label: string;
  getDateRange: (firstDate: Date, latestDate: Date) => { start: Date; end: Date };
}

interface AccordionProps {
  title: string;
  badge?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface ComparisonPeriodData {
  timeRange: TimeRange;
  start: Date;
  end: Date;
  years: string[];
  categoryAnalysis: CategoryAnalysis;
  groupAnalysis: GroupAnalysis;
  total: number;
  displayText: string;
}

const TIME_RANGES: TimeRange[] = [
  {
    id: 'last-12-months',
    label: 'Last 12 Months',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate);
      start.setMonth(start.getMonth() - 12);
      return { start, end: latestDate };
    }
  },
  {
    id: 'last-24-months',
    label: 'Last 24 Months',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate);
      start.setMonth(start.getMonth() - 24);
      return { start, end: latestDate };
    }
  },
  {
    id: 'last-36-months',
    label: 'Last 36 Months',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate);
      start.setMonth(start.getMonth() - 36);
      return { start, end: latestDate };
    }
  },
  {
    id: 'last-48-months',
    label: 'Last 48 Months',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate);
      start.setMonth(start.getMonth() - 48);
      return { start, end: latestDate };
    }
  },
  {
    id: 'last-60-months',
    label: 'Last 60 Months',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate);
      start.setMonth(start.getMonth() - 60);
      return { start, end: latestDate };
    }
  },
  {
    id: 'ytd',
    label: 'YTD',
    getDateRange: (_, latestDate) => {
      const start = new Date(latestDate.getFullYear(), 0, 1);
      return { start, end: latestDate };
    }
  },
  {
    id: 'last-year',
    label: 'Last Year',
    getDateRange: (_, latestDate) => {
      const year = latestDate.getFullYear() - 1;
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      };
    }
  },
  {
    id: 'last-2-years',
    label: 'Last 2 Years',
    getDateRange: (_, latestDate) => {
      const endYear = latestDate.getFullYear() - 1;
      const startYear = endYear - 1;
      return {
        start: new Date(startYear, 0, 1),
        end: new Date(endYear, 11, 31)
      };
    }
  },
  {
    id: 'last-3-years',
    label: 'Last 3 Years',
    getDateRange: (_, latestDate) => {
      const endYear = latestDate.getFullYear() - 1;
      const startYear = endYear - 2;
      return {
        start: new Date(startYear, 0, 1),
        end: new Date(endYear, 11, 31)
      };
    }
  },
  {
    id: 'last-4-years',
    label: 'Last 4 Years',
    getDateRange: (_, latestDate) => {
      const endYear = latestDate.getFullYear() - 1;
      const startYear = endYear - 3;
      return {
        start: new Date(startYear, 0, 1),
        end: new Date(endYear, 11, 31)
      };
    }
  },
  {
    id: 'last-5-years',
    label: 'Last 5 Years',
    getDateRange: (_, latestDate) => {
      const endYear = latestDate.getFullYear() - 1;
      const startYear = endYear - 4;
      return {
        start: new Date(startYear, 0, 1),
        end: new Date(endYear, 11, 31)
      };
    }
  },
  {
    id: 'since-las-vegas',
    label: 'Since Las Vegas Only Home',
    getDateRange: () => ({
      start: new Date(2021, 0, 1),
      end: new Date(2025, 2, 31)
    })
  },
  {
    id: 'since-both-medicare',
    label: 'Since Both Medicare',
    getDateRange: () => ({
      start: new Date(2022, 9, 1),
      end: new Date(2025, 2, 31)
    })
  },
  {
    id: 'since-retired',
    label: 'Since Retired',
    getDateRange: () => ({
      start: new Date(2010, 7, 14),
      end: new Date(2025, 2, 31)
    })
  },
  {
    id: 'since-ret-till-both-non-medicare',
    label: 'Since Ret Till Both Non Medicare',
    getDateRange: () => ({
      start: new Date(2010, 7, 14),
      end: new Date(2021, 7, 31)
    })
  },
  {
    id: 'all-haverhill',
    label: 'All Haverhill Only Home',
    getDateRange: () => ({
      start: new Date(1997, 0, 1),
      end: new Date(2011, 9, 12)
    })
  },
  {
    id: 'till-retired',
    label: 'Till Retired',
    getDateRange: () => ({
      start: new Date(1997, 0, 1),
      end: new Date(2010, 7, 13)
    })
  },
  {
    id: 'till-2-homes',
    label: 'Till 2 homes',
    getDateRange: () => ({
      start: new Date(2011, 9, 13),
      end: new Date(2020, 11, 31)
    })
  },
  {
    id: 'covid-period',
    label: 'COVID inflationary period',
    getDateRange: () => ({
      start: new Date(2020, 2, 1),
      end: new Date(2023, 1, 28)
    })
  }
];

const Accordion = ({ title, badge, isOpen, onToggle, children }: AccordionProps) => (
  <div className="border rounded-lg overflow-hidden bg-white">
    <button
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target.closest('button') === e.currentTarget) {
          onToggle();
        }
      }}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{title}</span>
        {badge !== undefined && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            {badge}
          </span>
        )}
      </div>
      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
    {isOpen && (
      <div 
        className="p-4 border-t bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    )}
  </div>
);

function App() {
  const [data, setData] = useState<ExcelData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [hideZeroCategories, setHideZeroCategories] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupCategories, setGroupCategories] = useState<GroupCategories>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<string | null>(null);
  const [firstDate, setFirstDate] = useState<Date | null>(null);
  const [latestDate, setLatestDate] = useState<Date | null>(null);
  const [showGroupSubtotals, setShowGroupSubtotals] = useState(false);
  const [showOnlySubtotals, setShowOnlySubtotals] = useState(false);
  const [showYearValues, setShowYearValues] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getCategoryTabTitle = () => {
    if (selectedTimeRange && firstDate && latestDate) {
      const timeRange = TIME_RANGES.find(range => range.id === selectedTimeRange);
      if (timeRange) {
        const { start, end } = timeRange.getDateRange(firstDate, latestDate);
        return `Expenses By Categories for ${timeRange.label} (${formatDateDisplay(start)} to ${formatDateDisplay(end)})`;
      }
    } else if (selectedYears.length > 0) {
      return `Expenses By Categories for Years ${selectedYears.sort().join(', ')}`;
    }
    return 'Expenses By Categories';
  };

  useEffect(() => {
    if (categories.length > 0 && years.length > 0) {
      setSelectedGroups(groups);
    }
  }, [categories, years, groups]);

  useEffect(() => {
    const categoriesFromGroups = selectedGroups.flatMap(group => groupCategories[group] || []);
    const uniqueCategories = [...new Set(categoriesFromGroups)];
    setSelectedCategories(uniqueCategories);
  }, [selectedGroups, groupCategories]);

  useEffect(() => {
    if (selectedTimeRange && firstDate && latestDate) {
      const timeRange = TIME_RANGES.find(range => range.id === selectedTimeRange);
      if (timeRange) {
        const { start, end } = timeRange.getDateRange(firstDate, latestDate);
        const yearsInRange = new Set<string>();
        
        for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
          yearsInRange.add(year.toString());
        }
        
        setSelectedYears([...yearsInRange]);
      }
    }
  }, [selectedTimeRange, firstDate, latestDate]);

  useEffect(() => {
    if (data.length > 0 && firstDate && latestDate) {
      setSelectedTimeRange('last-12-months');
    }
  }, [data.length, firstDate, latestDate]);

  const parseDate = (dateStr: string): Date => {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateYearsBetweenDates = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Number(diffYears.toFixed(2));
  };

  const getTimeRangeDisplay = (): string => {
    if (!selectedTimeRange || !firstDate || !latestDate) return '';

    const timeRange = TIME_RANGES.find(range => range.id === selectedTimeRange);
    if (!timeRange) return '';

    const { start, end } = timeRange.getDateRange(firstDate, latestDate);
    const years = calculateYearsBetweenDates(start, end);
    return `${timeRange.label} (${formatDateDisplay(start)} to ${formatDateDisplay(end)}) ${years} Years`;
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = 'Report';
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json<ExcelData>(ws);

      const processedData = rawData.map(row => ({
        ...row,
        Date: typeof row.Date === 'string' ? row.Date : new Date((row.Date as number - 1) * 24 * 60 * 60 * 1000 + new Date('1900-01-01').getTime()).toLocaleDateString('en-US')
      }));

      let first: Date | null = null;
      let latest: Date | null = null;

      processedData.forEach(row => {
        const date = parseDate(row.Date);
        if (!first || date < first) first = date;
        if (!latest || date > latest) latest = date;
      });

      setFirstDate(first);
      setLatestDate(latest);

      const uniqueCategories = [...new Set(processedData.map(item => item.Category))].sort();
      const uniqueYears = [...new Set(processedData.map(item => {
        const parts = item.Date.split('/');
        return parts[2];
      }))].sort((a, b) => parseInt(a) - parseInt(b));

      const groupMap: GroupCategories = {};
      const uniqueGroups = new Set<string>();

      processedData.forEach(row => {
        if (row.Group && row.Category) {
          uniqueGroups.add(row.Group);
          if (!groupMap[row.Group]) {
            groupMap[row.Group] = [];
          }
          if (!groupMap[row.Group].includes(row.Category)) {
            groupMap[row.Group].push(row.Category);
          }
        }
      });

      setData(processedData);
      setCategories(uniqueCategories);
      setYears(uniqueYears);
      setGroups([...uniqueGroups].sort());
      setGroupCategories(groupMap);
    };
    reader.readAsBinaryString(file);
  }, []);

  const calculateTotal = useCallback(() => {
    if (!data.length) return 0;

    return data
      .filter(row => {
        const year = row.Date.split('/')[2];
        return (
          (selectedCategories.length === 0 || selectedCategories.includes(row.Category)) &&
          (selectedYears.length === 0 || selectedYears.includes(year))
        );
      })
      .reduce((sum, row) => {
        const amountStr = typeof row.Amount === 'string' ? row.Amount : String(row.Amount);
        const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
  }, [data, selectedCategories, selectedYears]);

  const categoryAnalysis = useMemo(() => {
    const analysis: CategoryAnalysis = {};
    
    if (!data.length) return analysis;

    const filteredCategories = selectedCategories;
    const filteredYears = selectedYears;

    if (filteredCategories.length === 0 || filteredYears.length === 0) {
      return analysis;
    }

    filteredCategories.forEach(category => {
      analysis[category] = {
        average: { annual: 0, monthly: 0, weekly: 0 }
      };
      filteredYears.forEach(year => {
        analysis[category][year] = { annual: 0, monthly: 0, weekly: 0 };
      });
    });

    data.forEach(row => {
      const year = row.Date.split('/')[2];
      if (!filteredYears.includes(year) || !filteredCategories.includes(row.Category)) return;

      const amountStr = typeof row.Amount === 'string' ? row.Amount : String(row.Amount);
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      if (isNaN(amount)) return;

      analysis[row.Category][year].annual += amount;
    });

    filteredCategories.forEach(category => {
      let totalAnnual = 0;
      let yearCount = 0;

      filteredYears.forEach(year => {
        const annual = analysis[category][year].annual;
        analysis[category][year].monthly = annual / 12;
        analysis[category][year].weekly = annual / 52;
        
        totalAnnual += annual;
        yearCount++;
      });

      analysis[category].average = {
        annual: totalAnnual / yearCount,
        monthly: (totalAnnual / yearCount) / 12,
        weekly: (totalAnnual / yearCount) / 52
      };
    });

    return analysis;
  }, [data, selectedCategories, selectedYears]);

  const groupAnalysis = useMemo(() => {
    const analysis: GroupAnalysis = {};
    
    if (!data.length) return analysis;

    groups.forEach(group => {
      analysis[group] = {
        average: { annual: 0, monthly: 0, weekly: 0, categories: [] },
      };
      selectedYears.forEach(year => {
        analysis[group][year] = { annual: 0, monthly: 0, weekly: 0, categories: [] };
      });
    });

    Object.entries(categoryAnalysis).forEach(([category, categoryData]) => {
      const group = Object.entries(groupCategories).find(([_, categories]) => 
        categories.includes(category)
      )?.[0];

      if (group && analysis[group]) {
        analysis[group].average.categories.push(category);
        selectedYears.forEach(year => {
          analysis[group][year].categories.push(category);
          analysis[group][year].annual += categoryData[year]?.annual || 0;
          analysis[group][year].monthly += categoryData[year]?.monthly || 0;
          analysis[group][year].weekly += categoryData[year]?.weekly || 0;
        });
        analysis[group].average.annual += categoryData.average?.annual || 0;
        analysis[group].average.monthly += categoryData.average?.monthly || 0;
        analysis[group].average.weekly += categoryData.average?.weekly || 0;
      }
    });

    return analysis;
  }, [categoryAnalysis, groups, selectedYears, groupCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleYear = (year: string) => {
    setSelectedTimeRange(null);
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const selectAllCategories = () => setSelectedCategories([...categories]);
  const clearAllCategories = () => setSelectedCategories([]);
  const selectAllYears = () => setSelectedYears([...years]);
  const clearAllYears = () => {
    setSelectedYears([]);
    setSelectedTimeRange(null);
  };
  const selectAllGroups = () => setSelectedGroups([...groups]);
  const clearAllGroups = () => setSelectedGroups([]);

  const clearTimeRangeAndYears = () => {
    setSelectedTimeRange(null);
    setSelectedYears([]);
  };

  const handleTimeRangeChange = (rangeId: string) => {
    if (selectedTimeRange === rangeId) {
      setSelectedTimeRange(null);
      setSelectedYears([]);
    } else {
      setSelectedTimeRange(rangeId);
      setSelectedYears([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const TabLink = ({ to, icon: Icon, children }: { to: string; icon: React.ElementType; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      <Icon className="w-5 h-5 mr-2" />
      {children}
    </NavLink>
  );

  const SelectionButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
    >
      {children}
    </button>
  );

  const SelectionControls = () => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSection = (section: string) => {
      setOpenSection(openSection === section ? null : section);
    };

    const filteredGroups = groups.filter(group =>
      group.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCategories = categories.filter(category =>
      category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredYears = years.filter(year =>
      year.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGroupChange = (e: React.ChangeEvent<HTMLInputElement>, group: string) => {
      e.stopPropagation();
      toggleGroup(group);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>, year: string) => {
      e.stopPropagation();
      toggleYear(year);
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
      e.stopPropagation();
      toggleCategory(category);
    };

    const handleTimeRangeClick = (e: React.MouseEvent, rangeId: string) => {
      e.stopPropagation();
      handleTimeRangeChange(rangeId);
    };

    return (
      <div className="space-y-4 h-full overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search groups, categories, or years..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <Accordion
          title="Groups"
          badge={selectedGroups.length}
          isOpen={openSection === 'groups'}
          onToggle={() => toggleSection('groups')}
        >
          <div className="space-y-4">
            <div className="flex justify-between">
              <SelectionButton onClick={(e) => { e.stopPropagation(); selectAllGroups(); }}>
                Select All
              </SelectionButton>
              <SelectionButton onClick={(e) => { e.stopPropagation(); clearAllGroups(); }}>
                Clear All
              </SelectionButton>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredGroups.map(group => (
                <label key={group} className="flex items-center p-2 bg-white rounded hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group)}
                    onChange={(e) => handleGroupChange(e, group)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm truncate">{group}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion
          title="Years"
          badge={selectedYears.length}
          isOpen={openSection === 'years'}
          onToggle={() => toggleSection('years')}
        >
          <div className="space-y-4">
            <div className="flex justify-between">
              <SelectionButton onClick={(e) => { e.stopPropagation(); selectAllYears(); }}>
                Select All
              </SelectionButton>
              <SelectionButton onClick={(e) => { e.stopPropagation(); clearAllYears(); }}>
                Clear All
              </SelectionButton>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredYears.map(year => (
                <label key={year} className="flex items-center p-2 bg-white rounded hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={(e) => handleYearChange(e, year)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm truncate">{year}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion
          title="Time Range"
          badge={selectedTimeRange ? 1 : 0}
          isOpen={openSection === 'timeRange'}
          onToggle={() => toggleSection('timeRange')}
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <SelectionButton onClick={(e) => { e.stopPropagation(); clearTimeRangeAndYears(); }}>
                Clear All
              </SelectionButton>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {TIME_RANGES.map(range => (
                <label key={range.id} className="flex items-center p-2 bg-white rounded hover:bg-gray-100">
                  <input
                    type="radio"
                    checked={selectedTimeRange === range.id}
                    onChange={(e) => handleTimeRangeClick(e, range.id)}
                    className="rounded-full border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm truncate">{range.label}</span>
                </label>
              ))}
            </div>
            {selectedTimeRange && (
              <p className="text-sm text-blue-600 mt-2">
                {getTimeRangeDisplay()}
              </p>
            )}
          </div>
        </Accordion>

        <Accordion
          title="Categories"
          badge={selectedCategories.length}
          isOpen={openSection === 'categories'}
          onToggle={() => toggleSection('categories')}
        >
          <div className="space-y-4">
            <div className="flex justify-between">
              <SelectionButton onClick={(e) => { e.stopPropagation(); selectAllCategories(); }}>
                Select All
              </SelectionButton>
              <SelectionButton onClick={(e) => { e.stopPropagation(); clearAllCategories(); }}>
                Clear All
              </SelectionButton>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredCategories.map(category => (
                <label key={category} className="flex items-center p-2 bg-white rounded hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={(e) => handleCategoryChange(e, category)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm truncate">{category}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>
      </div>
    );
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Upload Excel File
        </label>
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">Excel file with "Report"
              sheet</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-2">Total Amount</h2>
        <p className="text-3xl font-bold text-blue-600">
          ${calculateTotal().toLocaleString('en-US',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {selectedCategories.length ?
            `Selected categories: ${selectedCategories.join(', ')}` : 'All categories'}
          <br />
          {selectedTimeRange ? `Time Range: ${TIME_RANGES.find(r => r.id === selectedTimeRange)?.label}` : 'No time range selected'}
        </p>
      </div>
    </div>
  );

  const TrendsTab = () => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Spending Trends</h2>
      <p className="text-gray-600">Monthly and yearly spending trends will be displayed here.</p>
    </div>
  );

  const CategoryAnalysisTab = () => {
    const displayYears = selectedYears;
    const displayCategories = selectedCategories.sort();

    if (displayCategories.length === 0 || displayYears.length === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Please select at least one group and time range to view the analysis.</p>
          </div>
        </div>
      );
    }

    const totals = {
      average: { annual: 0, monthly: 0, weekly: 0 },
      years: {} as Record<string, CategoryTotal>
    };

    const filteredCategories = hideZeroCategories
      ? displayCategories.filter(category => {
          const hasNonZeroValue = displayYears.some(year => 
            categoryAnalysis[category]?.[year]?.annual > 0
          ) || categoryAnalysis[category]?.average?.annual > 0;
          return hasNonZeroValue;
        })
      : displayCategories;

    filteredCategories.forEach(category => {
      totals.average.annual += categoryAnalysis[category]?.average?.annual || 0;
      totals.average.monthly += categoryAnalysis[category]?.average?.monthly || 0;
      totals.average.weekly += categoryAnalysis[category]?.average?.weekly || 0;

      displayYears.forEach(year => {
        if (!totals.years[year]) {
          totals.years[year] = { annual: 0, monthly: 0, weekly: 0 };
        }
        totals.years[year].annual += categoryAnalysis[category]?.[year]?.annual || 0;
        totals.years[year].monthly += categoryAnalysis[category]?.[year]?.monthly || 0;
        totals.years[year].weekly += categoryAnalysis[category]?.[year]?.weekly || 0;
      });
    });

    const AmountCell = ({ 
      amount, 
      type, 
      category, 
      year, 
      averageAmount,
      isSubtotal = false
    }: { 
      amount: number;
      type: 'annual' | 'monthly' | 'weekly';
      category?: string;
      year?: string;
      averageAmount?: number;
      isSubtotal?: boolean;
    }) => {
      const colorClasses = {
        annual: isSubtotal ? 'text-emerald-800 bg-emerald-100' : 'text-emerald-700 bg-emerald-50',
        monthly: isSubtotal ? 'text-blue-800 bg-blue-100' : 'text-blue-700 bg-blue-50',
        weekly: isSubtotal ? 'text-purple-800 bg-purple-100' : 'text-purple-700 bg-purple-50'
      };

      const shouldHighlight = type === 'annual' && year && averageAmount !== undefined && amount >= averageAmount;
      const borderClass = shouldHighlight ? 'border-2 border-red-500' : '';
      const fontClass = isSubtotal ? 'font-semibold' : '';

      return (
        <td className={`px-3 py-2 whitespace-nowrap text-right text-sm ${colorClasses[type]} ${borderClass} ${fontClass}`}>
          {formatCurrency(amount)}
        </td>
      );
    };

    const HeaderCell = ({ type }: { type: 'annual' | 'monthly' | 'weekly' }) => {
      const colorClasses = {
        annual: 'text-emerald-800 bg-emerald-100',
        monthly: 'text-blue-800 bg-blue-100',
        weekly: 'text-purple-800 bg-purple-100'
      };

      return (
        <th className={`px-3 py-2 text-right text-xs font-medium uppercase tracking-wider ${colorClasses[type]}`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </th>
      );
    };

    const renderCategoryRow = (category: string, groupName?: string) => (
      <tr key={category} className="hover:bg-gray-50">
        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white pl-6">
          {category}
        </td>
        <AmountCell amount={categoryAnalysis[category]?.average?.annual || 0} type="annual" />
        <AmountCell amount={categoryAnalysis[category]?.average?.monthly || 0} type="monthly" />
        <AmountCell amount={categoryAnalysis[category]?.average?.weekly || 0} type="weekly" />
        {showYearValues && displayYears.map(year => (
          <React.Fragment key={year}>
            <AmountCell 
              amount={categoryAnalysis[category]?.[year]?.annual || 0} 
              type="annual"
              category={category}
              year={year}
              averageAmount={categoryAnalysis[category]?.average?.annual || 0}
            />
            <AmountCell amount={categoryAnalysis[category]?.[year]?.monthly || 0} type="monthly" />
            <AmountCell amount={categoryAnalysis[category]?.[year]?.weekly || 0} type="weekly" />
          </React.Fragment>
        ))}
      </tr>
    );

    const renderGroupSubtotal = (group: string, index: number) => {
      const groupData = groupAnalysis[group];
      if (!groupData) return null;

      return (
        <tr key={`subtotal-${group}`} className="bg-gray-50">
          <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50">
            SUB TOTAL {index} - {group}
          </td>
          <AmountCell amount={groupData.average.annual} type="annual" isSubtotal />
          <AmountCell amount={groupData.average.monthly} type="monthly" isSubtotal />
          <AmountCell amount={groupData.average.weekly} type="weekly" isSubtotal />
          {showYearValues && displayYears.map(year => (
            <React.Fragment key={year}>
              <AmountCell 
                amount={groupData[year]?.annual || 0} 
                type="annual"
                year={year}
                averageAmount={groupData.average.annual}
                isSubtotal
              />
              <AmountCell amount={groupData[year]?.monthly || 0} type="monthly" isSubtotal />
              <AmountCell amount={groupData[year]?.weekly || 0} type="weekly" isSubtotal />
            </React.Fragment>
          ))}
        </tr>
      );
    };

    return (
      <>
        <h2 className="text-2xl font-bold mb-6">{getCategoryTabTitle()}</h2>
        <div className="space-y-6">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setShowGroupSubtotals(!showGroupSubtotals)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showGroupSubtotals ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Hide Group Subtotals
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Show Group Subtotals
                  </>
                )}
              </button>
              
              {showGroupSubtotals && (
                <button
                  onClick={() => setShowOnlySubtotals(!showOnlySubtotals)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {showOnlySubtotals ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show Categories
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Categories
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowYearValues(!showYearValues)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showYearValues ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Hide Years Values
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Show Years Values
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={() => setHideZeroCategories(!hideZeroCategories)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {hideZeroCategories ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Zero Values
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Zero Values
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                    Category/Group
                  </th>
                  <th colSpan={3} className="px-3 py-2 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                  {showYearValues && displayYears.map(year => (
                    <th key={year} colSpan={3} className="px-3 py-2 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {year}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    Period
                  </th>
                  <HeaderCell type="annual" />
                  <HeaderCell type="monthly" />
                  <HeaderCell type="weekly" />
                  {showYearValues && displayYears.map(year => (
                    <React.Fragment key={year}>
                      <HeaderCell type="annual" />
                      <HeaderCell type="monthly" />
                      <HeaderCell type="weekly" />
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                    Total
                  </td>
                  <AmountCell amount={totals.average.annual} type="annual" isSubtotal />
                  <AmountCell amount={totals.average.monthly} type="monthly" isSubtotal />
                  <AmountCell amount={totals.average.weekly} type="weekly" isSubtotal />
                  {showYearValues && displayYears.map(year => (
                    <React.Fragment key={year}>
                      <AmountCell 
                        amount={totals.years[year].annual} 
                        type="annual"
                        year={year}
                        averageAmount={totals.average.annual}
                        isSubtotal
                      />
                      <AmountCell amount={totals.years[year].monthly} type="monthly" isSubtotal />
                      <AmountCell amount={totals.years[year].weekly} type="weekly" isSubtotal />
                    </React.Fragment>
                  ))}
                </tr>
                {groups.map((group, index) => {
                  const groupCategories = filteredCategories.filter(category => 
                    groupAnalysis[group]?.average.categories.includes(category)
                  );
                  
                  if (groupCategories.length === 0) return null;

                  return (
                    <React.Fragment key={group}>
                      {(!showOnlySubtotals || !showGroupSubtotals) && 
                        groupCategories.map(category => renderCategoryRow(category, group))}
                      {showGroupSubtotals && renderGroupSubtotal(group, index + 1)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const ComparisonTab = () => {
    const [firstTimeRange, setFirstTimeRange] = useState<string | null>(null);
    const [secondTimeRange, setSecondTimeRange] = useState<string | null>(null);
    const [hideZeroCategories, setHideZeroCategories] = useState(false);
    
    const getComparisonData = (timeRangeId: string | null): ComparisonPeriodData | null => {
      if (!timeRangeId || !firstDate || !latestDate) return null;
      
      const timeRange = TIME_RANGES.find(range => range.id === timeRangeId);
      if (!timeRange) return null;
      
      const { start, end } = timeRange.getDateRange(firstDate, latestDate);
      const yearsInRange = new Set<string>();
      
      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        yearsInRange.add(year.toString());
      }
      
      const years = [...yearsInRange];
      let total = 0;
      const periodData = data.filter(row => {
        const date = parseDate(row.Date);
        return date >= start && date <= end;
      });
      
      const categoryAnalysis: CategoryAnalysis = {};
      const groupAnalysis: GroupAnalysis = {};
      
      categories.forEach(category => {
        categoryAnalysis[category] = {
          average: { annual: 0, monthly: 0, weekly: 0 }
        };
        years.forEach(year => {
          categoryAnalysis[category][year] = { annual: 0, monthly: 0, weekly: 0 };
        });
      });

      periodData.forEach(row => {
        const amountStr = typeof row.Amount === 'string' ? row.Amount : String(row.Amount);
        const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
        if (isNaN(amount)) return;

        const year = row.Date.split('/')[2];
        if (categoryAnalysis[row.Category]) {
          categoryAnalysis[row.Category][year].annual += amount;
          total += amount;
        }
      });

      categories.forEach(category => {
        let totalAnnual = 0;
        let yearCount = 0;

        years.forEach(year => {
          const annual = categoryAnalysis[category][year].annual;
          categoryAnalysis[category][year].monthly = annual / 12;
          categoryAnalysis[category][year].weekly = annual / 52;
          totalAnnual += annual;
          yearCount++;
        });

        categoryAnalysis[category].average = {
          annual: totalAnnual / yearCount,
          monthly: (totalAnnual / yearCount) / 12,
          weekly: (totalAnnual / yearCount) / 52
        };
      });

      groups.forEach(group => {
        groupAnalysis[group] = {
          average: { annual: 0, monthly: 0, weekly: 0, categories: [] },
        };
        years.forEach(year => {
          groupAnalysis[group][year] = { annual: 0, monthly: 0, weekly: 0, categories: [] };
        });
      });

      Object.entries(categoryAnalysis).forEach(([category, categoryData]) => {
        const group = Object.entries(groupCategories).find(([_, categories]) => 
          categories.includes(category)
        )?.[0];

        if (group && groupAnalysis[group]) {
          groupAnalysis[group].average.categories.push(category);
          years.forEach(year => {
            groupAnalysis[group][year].categories.push(category);
            groupAnalysis[group][year].annual += categoryData[year]?.annual || 0;
            groupAnalysis[group][year].monthly += categoryData[year]?.monthly || 0;
            groupAnalysis[group][year].weekly += categoryData[year]?.weekly || 0;
          });
          groupAnalysis[group].average.annual += categoryData.average?.annual || 0;
          groupAnalysis[group].average.monthly += categoryData.average?.monthly || 0;
          groupAnalysis[group].average.weekly += categoryData.average?.weekly || 0;
        }
      });
      
      return {
        timeRange,
        start,
        end,
        years,
        categoryAnalysis,
        groupAnalysis,
        total,
        displayText: `${timeRange.label} (${formatDateDisplay(start)} to ${formatDateDisplay(end)})`
      };
    };

    const firstPeriod = getComparisonData(firstTimeRange);
    const secondPeriod = getComparisonData(secondTimeRange);

    const calculatePercentDifference = (value1: number, value2: number): string => {
      if (value1 === 0) return 'N/A';
      const diff = ((value2 - value1) / Math.abs(value1)) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const renderComparisonTable = () => {
      if (!firstPeriod || !secondPeriod) return null;

      const filteredCategories = hideZeroCategories
        ? categories.filter(category => {
            const firstValue = firstPeriod.categoryAnalysis[category]?.average?.annual || 0;
            const secondValue = secondPeriod.categoryAnalysis[category]?.average?.annual || 0;
            return firstValue > 0 || secondValue > 0;
          })
        : categories;

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white">
                  Category
                </th>
                <th colSpan={3} className="px-3 py-2 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {firstPeriod.timeRange.label}
                </th>
                <th colSpan={3} className="px-3 py-2 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {secondPeriod.timeRange.label}
                </th>
                <th className="px-3 py-2 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Difference
                </th>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Period
                </th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly</th>
                <th className="px-3 py-2 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Total Row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                  Total
                </td>
                <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(firstPeriod.total)}</td>
                <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(firstPeriod.total / 12)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(firstPeriod.total / 52)}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(secondPeriod.total)}</td>
                <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(secondPeriod.total / 12)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(secondPeriod.total / 52)}</td>
                <td className={`px-3 py-2 text-right ${secondPeriod.total > firstPeriod.total ? 'text-red-600' : 'text-green-600'}`}>
                  {calculatePercentDifference(firstPeriod.total, secondPeriod.total)}
                </td>
              </tr>

              {/* Category Rows */}
              {groups.map((group, index) => {
                const groupCategories = filteredCategories.filter(category => 
                  groupAnalysis[group]?.average.categories.includes(category)
                );

                if (groupCategories.length === 0) return null;

                const rows = [];

                // Add individual category rows
                groupCategories.forEach(category => {
                  const firstCat = firstPeriod.categoryAnalysis[category];
                  const secondCat = secondPeriod.categoryAnalysis[category];

                  rows.push(
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {category}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(firstCat?.average?.annual || 0)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(firstCat?.average?.monthly || 0)}</td>
                      <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(firstCat?.average?.weekly || 0)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(secondCat?.average?.annual || 0)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(secondCat?.average?.monthly || 0)}</td>
                      <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(secondCat?.average?.weekly || 0)}</td>
                      <td className={`px-3 py-2 text-right ${(secondCat?.average?.annual || 0) > (firstCat?.average?.annual || 0) ? 'text-red-600' : 'text-green-600'}`}>
                        {calculatePercentDifference(firstCat?.average?.annual || 0, secondCat?.average?.annual || 0)}
                      </td>
                    </tr>
                  );
                });

                // Add group subtotal
                const firstGroup = firstPeriod.groupAnalysis[group];
                const secondGroup = secondPeriod.groupAnalysis[group];

                rows.push(
                  <tr key={`subtotal-${group}`} className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                      SUB TOTAL {index + 1} - {group}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-800 bg-emerald-50">{formatCurrency(firstGroup?.average?.annual || 0)}</td>
                    <td className="px-3 py-2 text-right text-blue-800 bg-blue-50">{formatCurrency(firstGroup?.average?.monthly || 0)}</td>
                    <td className="px-3 py-2 text-right text-purple-800 bg-purple-50">{formatCurrency(firstGroup?.average?.weekly || 0)}</td>
                    <td className="px-3 py-2 text-right text-emerald-800 bg-emerald-50">{formatCurrency(secondGroup?.average?.annual || 0)}</td>
                    <td className="px-3 py-2 text-right text-blue-800 bg-blue-50">{formatCurrency(secondGroup?.average?.monthly || 0)}</td>
                    <td className="px-3 py-2 text-right text-purple-800 bg-purple-50">{formatCurrency(secondGroup?.average?.weekly || 0)}</td>
                    <td className={`px-3 py-2 text-right ${(secondGroup?.average?.annual || 0) > (firstGroup?.average?.annual || 0) ? 'text-red-600' : 'text-green-600'} bg-gray-50`}>
                      {calculatePercentDifference(firstGroup?.average?.annual || 0, secondGroup?.average?.annual || 0)}
                    </td>
                  </tr>
                );

                return rows;
              })}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Compare Time Periods</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* First Period */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">First Period</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {TIME_RANGES.map(range => (
                  <label key={range.id} className="flex items-center p-2 bg-gray-50 rounded hover:bg-gray-100">
                    <input
                      type="radio"
                      checked={firstTimeRange === range.id}
                      onChange={() => setFirstTimeRange(range.id)}
                      className="rounded-full border-gray-300 text-blue-600"
                    />
                    <span className="ml-2 text-sm">{range.label}</span>
                  </label>
                ))}
              </div>
              {firstPeriod && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">{firstPeriod.displayText}</p>
                  <p className="text-2xl font-bold text-blue-700 mt-2">
                    {formatCurrency(firstPeriod.total)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Second Period */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Second Period</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {TIME_RANGES.map(range => (
                  <label key={range.id} className="flex items-center p-2 bg-gray-50 rounded hover:bg-gray-100">
                    <input
                      type="radio"
                      checked={secondTimeRange === range.id}
                      onChange={() => setSecondTimeRange(range.id)}
                      className="rounded-full border-gray-300 text-blue-600"
                    />
                    <span className="ml-2 text-sm">{range.label}</span>
                  </label>
                ))}
              </div>
              {secondPeriod && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">{secondPeriod.displayText}</p>
                  <p className="text-2xl font-bold text-green-700 mt-2">
                    {formatCurrency(secondPeriod.total)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {firstPeriod && secondPeriod && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detailed Comparison</h3>
              <button
                onClick={() => setHideZeroCategories(!hideZeroCategories)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {hideZeroCategories ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Zero Values
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Zero Values
                  </>
                )}
              </button>
            </div>
            {renderComparisonTable()}
          </div>
        )}
      </div>
    );
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 md:hidden bg-white p-2 rounded-lg shadow-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="h-full flex flex-col p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Quicken Transaction Analyzer</h1>
            </div>
            {data.length > 0 && <SelectionControls />}
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-80' : ''}`}>
          <div className="max-w-7xl mx-auto p-8">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-end mb-6">
                <div className="flex gap-2">
                  <TabLink to="/" icon={BarChart3}>Overview</TabLink>
                  <TabLink to="/trends" icon={TrendingUp}>Trends</TabLink>
                  <TabLink to="/categories" icon={PieChart}>Categories</TabLink>
                  <TabLink to="/comparison" icon={ArrowRightLeft}>Compare</TabLink>
                </div>
              </div>

              {data.length > 0 ? (
                <Routes>
                  <Route path="/" element={<OverviewTab />} />
                  <Route path="/trends" element={<TrendsTab />} />
                  <Route path="/categories" element={<CategoryAnalysisTab />} />
                  <Route path="/comparison" element={<ComparisonTab />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Upload Excel File
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Excel file with "Report" sheet</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;