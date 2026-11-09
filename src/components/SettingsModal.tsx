import React, { useState } from 'react';
import { ApiCredentials, AppSettings, ConnectionStatus } from '../types';
import {
  X,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Database,
  RefreshCw,
  Trash2,
  FileText,
  List,
  Clock,
  Sliders,
  AlignLeft,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: ApiCredentials;
  onSaveCredentials: (creds: ApiCredentials) => void;
  connectionStatus: ConnectionStatus;
  onTestConnections: (credsToTest?: ApiCredentials) => Promise<void>;
  isTesting: boolean;
  onClearSyncedHistory: () => void;
  syncedCount: number;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveCredentials,
  connectionStatus,
  onTestConnections,
  isTesting,
  onClearSyncedHistory,
  syncedCount,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<ApiCredentials>(credentials);
  const [settingsData, setSettingsData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'credentials' | 'formatting' | 'storage'>('credentials');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ApiCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveCredentials(formData);
    onSaveSettings(settingsData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestAndSave = async () => {
    onSaveCredentials(formData);
    onSaveSettings(settingsData);
    await onTestConnections(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4">
      {/* Modal Container: 0px border-radius, hairline border */}
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] shadow-none flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-11 px-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-[#ff6c37]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#e6edf3]">
              API Environment & Credentials
            </span>
            <span className="text-[10px] font-mono text-[#8b949e] px-1.5 py-0.5 bg-[#21262d] border border-[#30363d]">
              localStorage
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 border border-transparent hover:border-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-[#30363d] bg-[#161b22] px-4 pt-1">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'credentials'
                ? 'border-[#ff6c37] text-[#e6edf3]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            API Credentials
          </button>
          <button
            onClick={() => setActiveTab('formatting')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'formatting'
                ? 'border-[#ff6c37] text-[#e6edf3]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Notas & Formato
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'storage'
                ? 'border-[#ff6c37] text-[#e6edf3]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Data & Synced History ({syncedCount})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {activeTab === 'credentials' ? (
            <div className="space-y-4">
              {/* GitHub Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                    <span>GitHub Personal Access Token</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center space-x-1 text-[11px] font-mono">
                    {connectionStatus.github === 'connected' && (
                      <span className="text-[#238636] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {connectionStatus.githubUser ? `@${connectionStatus.githubUser}` : 'VALID'}
                      </span>
                    )}
                    {connectionStatus.github === 'error' && (
                      <span className="text-[#f85149] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> INVALID
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                  value={formData.githubToken}
                  onChange={(e) => handleChange('githubToken', e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                />
                <p className="text-[11px] text-[#8b949e]">
                  Requer permissões <code className="text-[#2f81f7] font-mono">repo</code> ou{' '}
                  <code className="text-[#2f81f7] font-mono">read:user</code> para listar
                  repositórios e commits.
                </p>
              </div>

              {/* GitHub Author Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                    <span>Filtro de Autor Git (Apenas Meus Commits)</span>
                  </label>
                  {connectionStatus.githubUser && (
                    <span className="text-[11px] font-mono text-[#238636]">
                      Detetado: @{connectionStatus.githubUser}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={
                    connectionStatus.githubUser
                      ? `@${connectionStatus.githubUser} (padrão) ou email de autor...`
                      : 'Username GitHub ou email nos commits...'
                  }
                  value={formData.githubAuthorFilter || ''}
                  onChange={(e) => handleChange('githubAuthorFilter', e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                />
                <p className="text-[11px] text-[#8b949e]">
                  Garante que apenas os seus commits são carregados e mapeados para o Harvest. Se vazio, utiliza automaticamente o utilizador autenticado ({connectionStatus.githubUser ? `@${connectionStatus.githubUser}` : 'seu perfil GitHub'}).
                </p>
              </div>

              {/* Gemini API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-[#ff6c37]" />
                    <span>Google Gemini API Key</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center space-x-1 text-[11px] font-mono">
                    {connectionStatus.gemini === 'connected' && (
                      <span className="text-[#238636] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CONNECTED (gemini-2.5-flash)
                      </span>
                    )}
                    {connectionStatus.gemini === 'error' && (
                      <span className="text-[#f85149] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> INVALID KEY
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={formData.geminiApiKey}
                  onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                />
                <p className="text-[11px] text-[#8b949e]">
                  Obtenha gratuitamente no{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2f81f7] hover:underline"
                  >
                    Google AI Studio
                  </a>
                  . Usado para agrupar e traduzir commits técnicos em tarefas executivas.
                </p>
              </div>

              {/* Harvest Configuration */}
              <div className="pt-2 border-t border-[#30363d] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#ff6c37]">
                    Harvest v2 Configuration
                  </span>
                  <div className="flex items-center space-x-1 text-[11px] font-mono">
                    {connectionStatus.harvest === 'connected' && (
                      <span className="text-[#238636] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {connectionStatus.harvestUser || 'CONNECTED'}
                      </span>
                    )}
                    {connectionStatus.harvest === 'error' && (
                      <span className="text-[#f85149] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> INVALID CREDENTIALS
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                      Account ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1234567"
                      value={formData.harvestAccountId}
                      onChange={(e) => handleChange('harvestAccountId', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="2345678.pt.xxxxxxxx..."
                      value={formData.harvestAccessToken}
                      onChange={(e) => handleChange('harvestAccessToken', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  Crie em{' '}
                  <a
                    href="https://id.getharvest.com/developers"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2f81f7] hover:underline"
                  >
                    Harvest Developers
                  </a>{' '}
                  em "Create New Personal Access Token".
                </p>
              </div>
            </div>
          ) : activeTab === 'formatting' ? (
            <div className="space-y-5">
              {/* Description Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#ff6c37]" />
                  <span>Formato da Descrição das Tarefas</span>
                </label>
                <p className="text-[11px] text-[#8b949e]">
                  Escolha se as notas e entregáveis devem ser gerados em texto corrido contínuo ou organizados em tópicos (bullets).
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsData((prev) => ({ ...prev, descriptionFormat: 'paragraph' }))
                    }
                    className={`flex items-start space-x-2.5 p-3 border text-left transition-colors ${
                      settingsData.descriptionFormat === 'paragraph'
                        ? 'border-[#ff6c37] bg-[#ff6c37]/10'
                        : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]'
                    }`}
                  >
                    <AlignLeft className="w-4 h-4 text-[#ff6c37] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[#e6edf3]">
                        Texto Normal (Parágrafo)
                      </div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">
                        Texto executivo fluido de 1 a 2 linhas, sem marcadores.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSettingsData((prev) => ({ ...prev, descriptionFormat: 'bullets' }))
                    }
                    className={`flex items-start space-x-2.5 p-3 border text-left transition-colors ${
                      settingsData.descriptionFormat === 'bullets'
                        ? 'border-[#ff6c37] bg-[#ff6c37]/10'
                        : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]'
                    }`}
                  >
                    <List className="w-4 h-4 text-[#ff6c37] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[#e6edf3]">
                        Em Tópicos (Bullets)
                      </div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">
                        Tópicos objetivos iniciados por marcadores (• ou -).
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Note Separator */}
              <div className="space-y-2 pt-2 border-t border-[#30363d]">
                <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#ff6c37]" />
                  <span>Separador entre Título e Descrição no Harvest</span>
                </label>
                <p className="text-[11px] text-[#8b949e]">
                  O Harvest recebe o Título Executivo e a Descrição combinados. Por padrão usa <code className="text-[#2f81f7] font-mono">: </code> (Título: Descrição). Pode escolher um atalho ou digitar qualquer separador personalizado:
                </p>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Dois pontos (: )', val: ': ' },
                    { label: 'Traço ( - )', val: ' - ' },
                    { label: 'Barra ( | )', val: ' | ' },
                    { label: 'Quebra de linha (\\n)', val: '\n' },
                    { label: 'Dois pontos + Linha (:\\n)', val: ':\n' },
                    { label: 'Dupla barra ( // )', val: ' // ' },
                    { label: 'Seta ( → )', val: ' → ' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() =>
                        setSettingsData((prev) => ({ ...prev, entrySeparator: p.val }))
                      }
                      className={`px-2.5 py-1 text-[11px] font-mono border transition-colors ${
                        settingsData.entrySeparator === p.val
                          ? 'border-[#ff6c37] bg-[#ff6c37]/15 text-[#ff6c37] font-semibold'
                          : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:text-[#e6edf3]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom separator input */}
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] text-[#8b949e]">
                    Separador Personalizado (qualquer texto ou símbolo):
                  </div>
                  <input
                    type="text"
                    value={settingsData.entrySeparator}
                    onChange={(e) =>
                      setSettingsData((prev) => ({ ...prev, entrySeparator: e.target.value }))
                    }
                    placeholder=": ou - ou qualquer separador..."
                    className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7]"
                  />
                </div>
              </div>

              {/* Dynamic Hours Format */}
              <div className="space-y-2 pt-2 border-t border-[#30363d]">
                <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#ff6c37]" />
                  <span>Apresentação das Horas (Super Dinâmicas)</span>
                </label>
                <p className="text-[11px] text-[#8b949e]">
                  As horas não precisam de ser inteiras: suportam frações como <code className="text-[#238636] font-mono">45m</code>, <code className="text-[#238636] font-mono">15m</code>, <code className="text-[#238636] font-mono">1h26m</code>, <code className="text-[#238636] font-mono">1.5</code> ou <code className="text-[#238636] font-mono">45 minutos</code>. Escolha como prefere visualizá-las nos cartões:
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsData((prev) => ({ ...prev, hoursDisplayFormat: 'natural' }))
                    }
                    className={`flex items-start space-x-2.5 p-3 border text-left transition-colors ${
                      settingsData.hoursDisplayFormat === 'natural'
                        ? 'border-[#ff6c37] bg-[#ff6c37]/10'
                        : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#ff6c37] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[#e6edf3]">
                        Formato Natural (1h 26m, 45m, 15m)
                      </div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">
                        Exibe horas e minutos reais no formato humano.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSettingsData((prev) => ({ ...prev, hoursDisplayFormat: 'decimal' }))
                    }
                    className={`flex items-start space-x-2.5 p-3 border text-left transition-colors ${
                      settingsData.hoursDisplayFormat === 'decimal'
                        ? 'border-[#ff6c37] bg-[#ff6c37]/10'
                        : 'border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]'
                    }`}
                  >
                    <div className="w-4 h-4 text-[#ff6c37] shrink-0 font-mono font-bold text-xs mt-0.5">
                      .0
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#e6edf3]">
                        Formato Decimal (1.43h, 0.75h)
                      </div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">
                        Exibe o valor decimal correspondente do Harvest.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="pt-2 border-t border-[#30363d] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span className="uppercase font-semibold">Exemplo em Tempo Real no Harvest</span>
                  <span className="text-[#ff6c37]">Preview</span>
                </div>
                <div className="p-3 bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
                  <span className="text-[#58a6ff] font-semibold">
                    Integration of DHIS2 Rules Engine in Event Modal
                  </span>
                  <span className="text-[#ff6c37] font-bold">
                    {settingsData.entrySeparator}
                  </span>
                  <span className="text-[#7ee787]">
                    {settingsData.descriptionFormat === 'bullets'
                      ? '• Integrated DHIS2 dynamic business rules engine into the event modal workflow.\n• Enhanced form state validation consistency.'
                      : 'Integrated DHIS2 dynamic business rules engine into the event modal workflow to ensure automated validation consistency.'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-[#30363d] bg-[#0d1117] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#2f81f7]" />
                    <span className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider">
                      Synced Commit Records
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 bg-[#161b22] border border-[#30363d] text-[#238636]">
                    {syncedCount} commits marcados
                  </span>
                </div>
                <p className="text-xs text-[#8b949e]">
                  O Commit2Harvest guarda localmente os hashes de commits que já foram submetidos para
                  o Harvest para evitar duplicações acidentais.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Tem a certeza que deseja limpar todo o histórico de commits sincronizados?'
                        )
                      ) {
                        onClearSyncedHistory();
                      }
                    }}
                    disabled={syncedCount === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#f85149] border border-[#f85149]/40 hover:bg-[#f85149]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Registos de Commits Sincronizados</span>
                  </button>
                </div>
              </div>

              <div className="border border-[#30363d] bg-[#0d1117] p-3 space-y-1">
                <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                  Variáveis de Ambiente Alternativas (.env)
                </span>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  Também pode configurar estas credenciais num ficheiro <code className="text-[#2f81f7]">.env</code> com:
                  <br />
                  <code className="text-[#e6edf3] font-mono text-[10px] block mt-1 bg-[#161b22] p-2 border border-[#30363d]">
                    VITE_GITHUB_TOKEN=...
                    <br />
                    VITE_GEMINI_API_KEY=...
                    <br />
                    VITE_HARVEST_ACCOUNT_ID=...
                    <br />
                    VITE_HARVEST_ACCESS_TOKEN=...
                  </code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 px-4 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTestAndSave}
              disabled={isTesting}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#e6edf3] bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff6c37]" />
                  <span>Testing APIs...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#ff6c37]" />
                  <span>Test Connections</span>
                </>
              )}
            </button>
            {savedSuccess && (
              <span className="text-xs font-mono text-[#238636] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => handleSave()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] transition-colors uppercase tracking-wider"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
