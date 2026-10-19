import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  Plus,
  Smartphone,
  Tag,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ScreenProtector, ProtectorBrandCompatibility, AuthUser } from '../types';
import { formatPKR } from '../utils/currency';

interface ProtectorsProps {
  protectors: ScreenProtector[];
  currentUser: AuthUser | null;
  onRefresh: () => void;
  onSaveProtector: (data: Partial<ScreenProtector> & { name: string }) => Promise<ScreenProtector>;
  onDeleteProtector: (id: string) => Promise<boolean>;
  onAddModel: (protectorId: string, brand: string, model: string) => Promise<ScreenProtector | null>;
  onRemoveModel: (protectorId: string, brand: string, model: string) => Promise<ScreenProtector | null>;
  onQuickNewSale?: () => void;
}

const COMMON_BRANDS = [
  'Oppo',
  'Realme',
  'Samsung',
  'Vivo',
  'Xiaomi',
  'Infinix',
  'Tecno',
  'Apple',
  'Poco',
  'Redmi',
  'Huawei',
  'OnePlus',
  'Google Pixel',
  'Nokia',
  'Honor',
  'Motorola',
];

const COMMON_CATEGORIES = [
  '9D Super Tempered Glass',
  '11D Full Glue Edge',
  'OG Crystal Super D',
  'Matte Anti-Spy Privacy',
  'King Kong Impact Glass',
  'Ceramic Flexible Nano',
  'Curved UV Liquid Glass',
  'Standard 2.5D Clear',
  'Anti-Static ESD Glass',
];

export const Protectors: React.FC<ProtectorsProps> = ({
  protectors,
  currentUser,
  onRefresh,
  onSaveProtector,
  onDeleteProtector,
  onAddModel,
  onRemoveModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProtector, setEditingProtector] = useState<ScreenProtector | null>(null);

  // Quick Add Model Modal
  const [quickAddModelTarget, setQuickAddModelTarget] = useState<{
    protectorId: string;
    protectorName: string;
    prefilledBrand?: string;
  } | null>(null);
  const [quickBrand, setQuickBrand] = useState('Oppo');
  const [quickModelText, setQuickModelText] = useState('');

  // Editor form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('9D Super Tempered Glass');
  const [formMaterial, setFormMaterial] = useState('High-Alumina Tempered Glass');
  const [formPrice, setFormPrice] = useState<number>(150);
  const [formNotes, setFormNotes] = useState('');
  const [formBrands, setFormBrands] = useState<{ brand: string; modelsText: string }[]>([
    { brand: 'Oppo', modelsText: 'A15, A16, A35, A54' },
    { brand: 'Realme', modelsText: 'C11, C12, C15' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Unique list of all brands currently in the database + defaults
  const allBrands = useMemo(() => {
    const brandSet = new Set<string>();
    protectors.forEach((p) => {
      p.compatibleBrands.forEach((b) => {
        if (b.brand && b.brand.trim()) {
          brandSet.add(b.brand.trim());
        }
      });
    });
    COMMON_BRANDS.forEach((b) => brandSet.add(b));
    return Array.from(brandSet).sort();
  }, [protectors]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalModelsCount = 0;
    const brandsSet = new Set<string>();
    protectors.forEach((p) => {
      p.compatibleBrands.forEach((b) => {
        if (b.brand) brandsSet.add(b.brand.toLowerCase());
        totalModelsCount += b.models.length;
      });
    });
    return {
      protectorsCount: protectors.length,
      modelsCount: totalModelsCount,
      brandsCount: brandsSet.size,
    };
  }, [protectors]);

  // Helper: determine if a phone model under a brand matches the search query (e.g. "Oppo A5", "Realme C11", "A5", "Oppo")
  const checkPhoneModelMatch = (
    brandName: string,
    modelName: string,
    cleanQuery: string,
    tokens: string[],
    compactQuery: string
  ): boolean => {
    if (!cleanQuery) return false;
    const bLower = brandName.toLowerCase();
    const mLower = modelName.toLowerCase();
    const fullPhone = `${bLower} ${mLower}`;
    const reversePhone = `${mLower} ${bLower}`;
    const compactPhone = `${bLower}${mLower}`.replace(/[\s\-_]/g, '');
    const compactModel = mLower.replace(/[\s\-_]/g, '');
    const compactBrand = bLower.replace(/[\s\-_]/g, '');

    // 1. Direct query inside model or brand
    if (mLower.includes(cleanQuery) || bLower.includes(cleanQuery)) {
      return true;
    }

    // 2. Full combined string (e.g. "oppo a5" or "a5 oppo")
    if (fullPhone.includes(cleanQuery) || reversePhone.includes(cleanQuery)) {
      return true;
    }

    // 3. Compact string without spaces or symbols (e.g. "oppoa5" or "oppoa54")
    if (compactQuery && (compactPhone.includes(compactQuery) || `${compactModel}${compactBrand}`.includes(compactQuery))) {
      return true;
    }

    // 4. Multi-token match: every word typed by user matches either brand or model
    if (tokens.length > 0) {
      const allTokensMatch = tokens.every((token) => {
        const cleanToken = token.replace(/[\s\-_]/g, '');
        return (
          bLower.includes(token) ||
          mLower.includes(token) ||
          fullPhone.includes(token) ||
          (cleanToken && compactPhone.includes(cleanToken)) ||
          (cleanToken && compactModel.includes(cleanToken))
        );
      });
      if (allTokensMatch) return true;
    }

    // 5. Brand + Model prefix match (e.g. user typed "Oppo A5", brand is "Oppo", model is or starts with "A5")
    if (tokens.length >= 2) {
      const brandToken = tokens.find((t) => bLower.includes(t) || t.includes(bLower));
      if (brandToken) {
        const modelTokens = tokens.filter((t) => t !== brandToken);
        const matchesModel = modelTokens.every((mt) => {
          const cleanMt = mt.replace(/[\s\-_]/g, '');
          return mLower.includes(mt) || (cleanMt && compactModel.includes(cleanMt));
        });
        if (matchesModel) return true;
      }
    }

    return false;
  };

  // Helper: determine if a specific model badge should be visually highlighted
  const isModelBadgeHighlighted = (
    brandName: string,
    modelName: string,
    cleanQuery: string,
    tokens: string[]
  ): boolean => {
    if (!cleanQuery) return false;
    const bLower = brandName.toLowerCase();
    const mLower = modelName.toLowerCase();
    const fullPhone = `${bLower} ${mLower}`;
    const compactQuery = cleanQuery.replace(/[\s\-_]/g, '');
    const compactModel = mLower.replace(/[\s\-_]/g, '');

    // Single query matches model directly
    if (mLower.includes(cleanQuery)) return true;
    if (compactQuery && compactModel.includes(compactQuery)) return true;

    // Multi-token query (e.g. "oppo a5" or "a5 oppo")
    if (tokens.length > 1) {
      const nonBrandTokens = tokens.filter((t) => !bLower.includes(t));
      if (nonBrandTokens.length > 0) {
        return nonBrandTokens.some(
          (t) => mLower.includes(t) || (t.length >= 2 && compactModel.includes(t.replace(/[\s\-_]/g, '')))
        );
      }
      return tokens.some((t) => mLower.includes(t));
    }

    if (fullPhone.includes(cleanQuery)) return true;
    return false;
  };

  // Search and Filter Logic
  const filteredProtectors = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    const compactQuery = cleanQuery.replace(/[\s\-_]/g, '');

    return protectors.filter((p) => {
      // Brand filter check (only enforce filter if no search query is typed, or if brand matches)
      if (selectedBrandFilter !== 'ALL' && !cleanQuery) {
        const hasBrand = p.compatibleBrands.some(
          (b) => b.brand.toLowerCase() === selectedBrandFilter.toLowerCase()
        );
        if (!hasBrand) return false;
      }

      // Query check (can match protector name, category, brand name, specific phone model, or "Brand Model" combo)
      if (!cleanQuery) return true;

      // 1. Protector name, category, or notes direct match
      if (p.name.toLowerCase().includes(cleanQuery)) return true;
      if ((p.category || '').toLowerCase().includes(cleanQuery)) return true;
      if ((p.notes || '').toLowerCase().includes(cleanQuery)) return true;
      if (p.name.toLowerCase().replace(/[\s\-_]/g, '').includes(compactQuery)) return true;

      // 2. All tokens matched across protector metadata
      const pCombinedMeta = `${p.name} ${p.category || ''} ${p.notes || ''}`.toLowerCase();
      if (tokens.length > 1 && tokens.every((t) => pCombinedMeta.includes(t))) {
        return true;
      }

      // 3. Any compatible brand / phone model matches (e.g. "Oppo A5", "Realme C11", "Samsung A12")
      const hasMatchingPhone = p.compatibleBrands.some((b) => {
        return b.models.some((m) =>
          checkPhoneModelMatch(b.brand, m, cleanQuery, tokens, compactQuery)
        );
      });
      if (hasMatchingPhone) return true;

      // 4. Combined query spanning protector name + brand/model (e.g. "Go 1 Oppo A15")
      if (tokens.length > 1) {
        const hasCombinedTokenMatch = p.compatibleBrands.some((b) => {
          return b.models.some((m) => {
            const fullEntity = `${p.name} ${b.brand} ${m}`.toLowerCase();
            return tokens.every((t) => fullEntity.includes(t));
          });
        });
        if (hasCombinedTokenMatch) return true;
      }

      return false;
    });
  }, [protectors, searchQuery, selectedBrandFilter]);

  // Specifically identify exact/direct mobile model matches for the search bar highlight
  const directModelMatches = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return [];

    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    const compactQuery = cleanQuery.replace(/[\s\-_]/g, '');

    const matches: {
      protector: ScreenProtector;
      brand: string;
      matchedModel: string;
      otherModelsInSameBrand: string[];
      otherBrands: { brand: string; count: number }[];
    }[] = [];

    protectors.forEach((p) => {
      p.compatibleBrands.forEach((b) => {
        b.models.forEach((m) => {
          if (checkPhoneModelMatch(b.brand, m, cleanQuery, tokens, compactQuery)) {
            matches.push({
              protector: p,
              brand: b.brand,
              matchedModel: m,
              otherModelsInSameBrand: b.models.filter((other) => other !== m),
              otherBrands: p.compatibleBrands
                .filter((otherB) => otherB.brand.toLowerCase() !== b.brand.toLowerCase())
                .map((otherB) => ({ brand: otherB.brand, count: otherB.models.length })),
            });
          }
        });
      });
    });

    return matches;
  }, [protectors, searchQuery]);

  // Open Editor for New or Existing Protector
  const handleOpenEditor = (prot?: ScreenProtector) => {
    setFormError(null);
    if (prot) {
      setEditingProtector(prot);
      setFormName(prot.name);
      setFormCategory(prot.category || '9D Super Tempered Glass');
      setFormMaterial(prot.material || 'Tempered Glass');
      setFormPrice(prot.defaultPrice || 150);
      setFormNotes(prot.notes || '');
      setFormBrands(
        prot.compatibleBrands.map((b) => ({
          brand: b.brand,
          modelsText: b.models.join(', '),
        }))
      );
    } else {
      setEditingProtector(null);
      setFormName('');
      setFormCategory('9D Super Tempered Glass');
      setFormMaterial('High-Alumina Tempered Glass');
      setFormPrice(150);
      setFormNotes('');
      // If user typed a search query, prefill it!
      const initialModel = searchQuery.trim();
      setFormBrands([
        { brand: 'Oppo', modelsText: initialModel ? initialModel : 'A15, A16, A35, A54' },
        { brand: 'Realme', modelsText: 'C11, C12, C15' },
      ]);
    }
    setIsEditorOpen(true);
  };

  // Add Brand Row in Editor
  const handleAddBrandRow = () => {
    setFormBrands((prev) => [...prev, { brand: 'Samsung', modelsText: '' }]);
  };

  const handleRemoveBrandRow = (idx: number) => {
    setFormBrands((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateBrandRow = (idx: number, field: 'brand' | 'modelsText', val: string) => {
    setFormBrands((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // Submit Protector
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Please enter a screen protector name (e.g. Go 1, OG-05, D+ 02).');
      return;
    }

    const processedCompatibleBrands: ProtectorBrandCompatibility[] = [];
    formBrands.forEach((row) => {
      const bName = row.brand.trim();
      if (!bName) return;
      const models = row.modelsText
        .split(/[,;\n]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
      if (models.length > 0) {
        processedCompatibleBrands.push({
          brand: bName,
          models: Array.from(new Set(models)),
        });
      }
    });

    if (processedCompatibleBrands.length === 0) {
      setFormError('Please add at least one mobile brand and compatible model.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProtector({
        id: editingProtector?.id,
        name: cleanName,
        category: formCategory.trim(),
        material: formMaterial.trim(),
        defaultPrice: formPrice,
        notes: formNotes.trim(),
        compatibleBrands: processedCompatibleBrands,
      });
      setIsEditorOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save screen protector.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Add Model to an existing Protector
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddModelTarget) return;

    const b = quickBrand.trim();
    const rawModels = quickModelText
      .split(/[,;\n]+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (!b || rawModels.length === 0) return;

    for (const model of rawModels) {
      await onAddModel(quickAddModelTarget.protectorId, b, model);
    }

    setQuickAddModelTarget(null);
    setQuickModelText('');
    onRefresh();
  };

  // Delete Confirmation Dialog state (in-app modal, avoids iframe window.confirm blocking)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ScreenProtector | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger in-app delete modal
  const handleDeleteProtector = (prot: ScreenProtector) => {
    setDeleteConfirmTarget(prot);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteProtector(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete protector:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy details helper
  const handleCopyDetails = (prot: ScreenProtector) => {
    const lines: string[] = [
      `📱 Screen Protector: ${prot.name} (${prot.category || 'Glass'})`,
      `Price: Rs ${prot.defaultPrice || 150}`,
      'Compatible Models:',
    ];
    prot.compatibleBrands.forEach((b) => {
      lines.push(`• ${b.brand}: ${b.models.join(', ')}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(prot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & METRICS BANNER                            */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Protectors &amp; Mobile Models</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Shared Service
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Search any mobile model to see which screen protector fits, or add new protector sizes &amp; mobile brands.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-add-protector"
            onClick={() => handleOpenEditor()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Protector</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. STATS ROW                                              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Screen Protectors
            </div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {stats.protectorsCount}
            </div>
            <div className="text-[10px] text-slate-400">Protector sizes &amp; codes</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Supported Models
            </div>
            <div className="text-xl font-black font-mono text-indigo-600 mt-0.5">
              {stats.modelsCount}
            </div>
            <div className="text-[10px] text-slate-400">Mobile phone models</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Brands Covered
            </div>
            <div className="text-xl font-black font-mono text-amber-600 mt-0.5">
              {stats.brandsCount}
            </div>
            <div className="text-[10px] text-slate-400">Oppo, Realme, Samsung, Vivo...</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. RAPID MOBILE MODEL SEARCH & FINDER BAR                 */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-search-mobile-model"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mobile model (e.g. Oppo A5, Oppo A15, Realme C11, Vivo Y12, Hot 10) or protector (Go 1)..."
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenEditor()}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              title="Add a new Screen Protector"
            >
              <Plus className="w-4 h-4" />
              <span>New Protector</span>
            </button>
          </div>
        </div>

        {/* Brand Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Brand:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedBrandFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedBrandFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Brands ({stats.protectorsCount})
          </button>
          {allBrands.map((bName) => {
            const count = protectors.filter((p) =>
              p.compatibleBrands.some((b) => b.brand.toLowerCase() === bName.toLowerCase())
            ).length;
            if (count === 0 && selectedBrandFilter !== bName) return null;
            return (
              <button
                key={bName}
                type="button"
                onClick={() => setSelectedBrandFilter(bName)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedBrandFilter === bName
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{bName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    selectedBrandFilter === bName
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DIRECT SEARCH HIGHLIGHT BANNER (If user typed a model) */}
      {/* ========================================================= */}
      {searchQuery.trim() && directModelMatches.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-2.5 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Found <strong className="underline decoration-emerald-500 font-extrabold">{directModelMatches.length}</strong> Screen Protector match
                {directModelMatches.length > 1 ? 'es' : ''} for model query: "{searchQuery}"
              </span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-bold">
              Instant Compatibility Result
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {directModelMatches.map((m, idx) => (
              <div
                key={`${m.protector.id}_${m.brand}_${m.matchedModel}_${idx}`}
                className="p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Protector Size:
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-300">
                        {m.protector.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        {m.protector.category || 'Screen Glass'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      {formatPKR(m.protector.defaultPrice || 0)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-4 h-4" />
                      <span>{m.brand} {m.matchedModel}</span>
                    </span>
                    {m.otherModelsInSameBrand.length > 0 && (
                      <span className="text-[11px] text-slate-600 font-medium">
                        + also fits {m.brand} ({m.otherModelsInSameBrand.slice(0, 3).join(', ')}
                        {m.otherModelsInSameBrand.length > 3 ? '...' : ''})
                      </span>
                    )}
                  </div>

                  {m.otherBrands.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-slate-500 font-medium">
                      Also fits: {m.otherBrands.map((ob) => `${ob.brand} (${ob.count} models)`).join(' • ')}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleCopyDetails(m.protector)}
                      className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === m.protector.id ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditor(m.protector)}
                      className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit this protector"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProtector(m.protector);
                      }}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                      title="Delete this protector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditor(m.protector)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Protector Card</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PROTECTORS LIST / CARDS VIEW                           */}
      {/* ========================================================= */}
      {filteredProtectors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              No Screen Protectors Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No protector matches model or size "${searchQuery}". Would you like to create a new protector or link this model?`
                : 'No protectors configured yet. Add your first protector model.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenEditor()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add New Protector</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProtectors.map((prot) => {
            const totalModels = prot.compatibleBrands.reduce(
              (sum, b) => sum + b.models.length,
              0
            );

            return (
              <div
                key={prot.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Size:
                        </span>
                        <h3 className="text-base font-black text-slate-900 font-mono tracking-tight bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/90">
                          {prot.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                          {formatPKR(prot.defaultPrice || 0)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {prot.category || 'Screen Protector'}
                      </div>
                    </div>

                    {/* Quick Card Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyDetails(prot)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                        title="Copy All Compatible Models"
                      >
                        {copiedId === prot.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditor(prot)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                        title="Edit Protector & Models"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id={`btn-delete-protector-${prot.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProtector(prot);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Protector"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {prot.notes && (
                    <p className="text-[11px] text-slate-600 mt-2 italic bg-white p-1.5 rounded border border-slate-200/60 leading-tight">
                      {prot.notes}
                    </p>
                  )}
                </div>

                {/* Card Body: Compatible Brands & Models */}
                <div className="p-4 space-y-3.5 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Compatible Phone Models ({totalModels})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickAddModelTarget({
                          protectorId: prot.id,
                          protectorName: prot.name,
                        })
                      }
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer transition-colors"
                      title="Quickly add a model to this protector"
                    >
                      + Add Phone
                    </button>
                  </div>

                  <div className="space-y-3">
                    {prot.compatibleBrands.map((b) => (
                      <div key={b.brand} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <span className="text-slate-900 font-extrabold">{b.brand}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.models.length} model{b.models.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {b.models.map((model) => {
                            const isSearchMatch =
                              searchQuery.trim().length > 0 &&
                              isModelBadgeHighlighted(
                                b.brand,
                                model,
                                searchQuery.trim().toLowerCase(),
                                searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
                              );

                            return (
                              <span
                                key={model}
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono transition-all ${
                                  isSearchMatch
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-2xs font-extrabold'
                                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80'
                                }`}
                              >
                                {model}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Fits {totalModels} models across {prot.compatibleBrands.length} brands</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickAddModelTarget({
                        protectorId: prot.id,
                        protectorName: prot.name,
                      })
                    }
                    className="font-bold text-slate-800 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    + Link Model
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: ADD / EDIT SCREEN PROTECTOR                     */}
      {/* ========================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">
                  {editingProtector ? `Edit Protector: ${editingProtector.name}` : 'Add New Screen Protector'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Protector Name & Retail Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Protector Name / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Go 1, OG-05, D+ 02, King Kong 12"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    The code or label printed on the protector box.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Retail Price (PKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                      placeholder="150"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Category & Material */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Protector Type / Category
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. 9D Super Tempered Glass"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="category-suggestions">
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material / Glass Specs
                  </label>
                  <input
                    type="text"
                    value={formMaterial}
                    onChange={(e) => setFormMaterial(e.target.value)}
                    placeholder="e.g. High-Alumina, 9H Hardness, Matte Anti-Peeping"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 3: Mobile Brands & Compatible Models Repeater */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Compatible Mobile Brands &amp; Phone Models *</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Separate models by commas (e.g. "A15, A16, A35, A54" for Oppo).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBrandRow}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Add Brand</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formBrands.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            Brand #{idx + 1}:
                          </span>
                          <input
                            type="text"
                            list="brands-suggestions"
                            value={row.brand}
                            onChange={(e) => handleUpdateBrandRow(idx, 'brand', e.target.value)}
                            placeholder="e.g. Oppo, Realme, Samsung"
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                          />
                        </div>

                        {formBrands.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBrandRow(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove this brand row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={row.modelsText}
                          onChange={(e) => handleUpdateBrandRow(idx, 'modelsText', e.target.value)}
                          placeholder="Type models: A15, A16, A35, A54 (separated by commas)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                  <datalist id="brands-suggestions">
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes (Cutouts, Notch, Bevel, Glue)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 9D Full Glue, Black Border, Camera Waterdrop Cutout"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
                {editingProtector ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingProtector;
                      setIsEditorOpen(false);
                      setDeleteConfirmTarget(target);
                    }}
                    className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Delete this screen protector"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{isSaving ? 'Saving...' : 'Save Screen Protector'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: QUICK ADD PHONE MODEL TO EXISTING PROTECTOR     */}
      {/* ========================================================= */}
      {quickAddModelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Link Phone to "{quickAddModelTarget.protectorName}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModelTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Brand
                </label>
                <input
                  type="text"
                  list="quick-brands-list"
                  required
                  value={quickBrand}
                  onChange={(e) => setQuickBrand(e.target.value)}
                  placeholder="e.g. Oppo, Realme, Vivo, Samsung"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <datalist id="quick-brands-list">
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Model Name(s) *
                </label>
                <input
                  type="text"
                  required
                  value={quickModelText}
                  onChange={(e) => setQuickModelText(e.target.value)}
                  placeholder="e.g. A16, A17k or multiple: A16, A17, A54"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can type a single model or comma-separated list of models.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAddModelTarget(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save &amp; Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MODAL: IN-APP DELETE CONFIRMATION DIALOG               */}
      {/* ========================================================= */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Delete Screen Protector?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Permanent removal from database
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete this screen protector and all its associated mobile model mappings?
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-5">
              <div className="text-sm font-black text-slate-900 font-mono flex items-center justify-between">
                <span>{deleteConfirmTarget.name}</span>
                <span className="text-emerald-700 font-bold text-xs">
                  {formatPKR(deleteConfirmTarget.defaultPrice || 0)}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                <span>{deleteConfirmTarget.category || 'Screen Glass'}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">
                  {deleteConfirmTarget.compatibleBrands.reduce((sum, b) => sum + b.models.length, 0)} phone model{deleteConfirmTarget.compatibleBrands.reduce((sum, b) => sum + b.models.length, 0) !== 1 ? 's' : ''} mapped
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-cancel-delete-protector"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-protector"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Protector'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
