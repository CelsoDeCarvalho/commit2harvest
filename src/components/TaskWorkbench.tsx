import React from 'react';
import { HarvestProjectAssignment, WorkbenchTask } from '../types';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  Layers,
  ArrowRight,
  Clock,
  Calendar,
  Languages,
} from 'lucide-react';

interface TaskWorkbenchProps {
  tasks: WorkbenchTask[];
  onUpdateTask: (id: string, updates: Partial<WorkbenchTask>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onClearTasks: () => void;
  onTransformWithGemini: () => void;
  isTransforming: boolean;
  selectedCommitCount: number;
  projectAssignments: HarvestProjectAssignment[];
  isLoadingProjects: boolean;
  onPushTaskToHarvest: (task: WorkbenchTask) => Promise<void>;
  onPushAllReadyToHarvest: () => Promise<void>;
  isPushingAll: boolean;
  onApplyProjectToAll: (projectId: number, taskId: number) => void;
  generationLanguage: 'en' | 'pt';
  onToggleGenerationLanguage: (lang: 'en' | 'pt') => void;
  onTranslateTask: (taskId: string, targetLang?: 'en' | 'pt') => Promise<void>;
  onTranslateAllTasks: (targetLang: 'en' | 'pt') => Promise<void>;
  translatingTaskId: string | null;
  isTranslatingAll: boolean;
}

export const TaskWorkbench: React.FC<TaskWorkbenchProps> = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onClearTasks,
  onTransformWithGemini,
  isTransforming,
  selectedCommitCount,
  projectAssignments,
  isLoadingProjects,
  onPushTaskToHarvest,
  onPushAllReadyToHarvest,
  isPushingAll,
  onApplyProjectToAll,
  generationLanguage,
  onToggleGenerationLanguage,
  onTranslateTask,
  onTranslateAllTasks,
  translatingTaskId,
  isTranslatingAll,
}) => {
  const readyTasks = tasks.filter(
    (t) => t.syncStatus !== 'synced' && t.projectId && t.taskId && t.hours > 0
  );
  const totalHours = tasks.reduce((acc, t) => acc + (Number(t.hours) || 0), 0);
  const syncedTasksCount = tasks.filter((t) => t.syncStatus === 'synced').length;

  return (
    <main className="w-full lg:w-7/12 bg-[#0d1117] flex flex-col h-full overflow-hidden select-none">
      {/* Pane Section Header */}
      <div className="h-8 px-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
          <Briefcase className="w-3.5 h-3.5 text-[#ff6c37]" />
          <span>TARGET: HARVEST TIME ENTRIES</span>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono text-[#8b949e]">
          <span>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
          <span className="text-[#30363d]">|</span>
          <span className="text-[#e6edf3] font-semibold tabular-nums">
            {totalHours.toFixed(2)} hrs total
          </span>
          {syncedTasksCount > 0 && (
            <>
              <span className="text-[#30363d]">|</span>
              <span className="text-[#238636] font-mono">
                {syncedTasksCount} pushed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Header Bar (Postman Workbench Action Controls) */}
      <div className="p-2 border-b border-[#30363d] bg-[#161b22] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* Transform Selected with Gemini */}
          <div className="flex items-center">
            <button
              onClick={onTransformWithGemini}
              disabled={isTransforming || selectedCommitCount === 0}
              className="flex items-center space-x-1.5 bg-[#ff6c37] hover:bg-[#e55b2b] text-white font-medium px-3.5 py-1.5 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={`Group and generate timesheet tasks in ${
                generationLanguage === 'en' ? 'English' : 'Portuguese'
              } using Gemini AI`}
            >
              {isTransforming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transforming with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Transform Selected ({selectedCommitCount})
                  </span>
                </>
              )}
            </button>

            {/* Generation Language Selector Pill (Default: English) */}
            <div
              className="flex items-center bg-[#0d1117] border border-l-0 border-[#30363d] px-1 py-1 text-xs font-mono"
              title="Idioma de geração do Gemini (Inglês por defeito)"
            >
              <button
                type="button"
                onClick={() => onToggleGenerationLanguage('en')}
                className={`px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  generationLanguage === 'en'
                    ? 'bg-[#ff6c37] text-white font-bold'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title="Gerar em Inglês (Padrão)"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onToggleGenerationLanguage('pt')}
                className={`px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  generationLanguage === 'pt'
                    ? 'bg-[#ff6c37] text-white font-bold'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title="Gerar em Português"
              >
                PT
              </button>
            </div>
          </div>

          {/* Batch Translate All Tasks Button (Active when tasks exist) */}
          {tasks.length > 0 && (
            <div className="flex items-center bg-[#0d1117] border border-[#30363d]">
              <button
                type="button"
                onClick={() => onTranslateAllTasks('en')}
                disabled={isTranslatingAll}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono text-[#e6edf3] hover:bg-[#21262d] transition-colors disabled:opacity-50"
                title="Traduzir todas as tarefas da bancada para Inglês"
              >
                {isTranslatingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#2f81f7]" />
                ) : (
                  <Languages className="w-3 h-3 text-[#2f81f7]" />
                )}
                <span>Traduzir Todas (EN)</span>
              </button>
              <span className="text-[#30363d]">|</span>
              <button
                type="button"
                onClick={() => onTranslateAllTasks('pt')}
                disabled={isTranslatingAll}
                className="px-2 py-1 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors disabled:opacity-50"
                title="Traduzir todas as tarefas para Português"
              >
                PT
              </button>
            </div>
          )}

          {/* Push All Ready */}
          <button
            onClick={onPushAllReadyToHarvest}
            disabled={isPushingAll || readyTasks.length === 0}
            className="flex items-center space-x-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-medium px-3.5 py-1.5 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Push all ready tasks directly to Harvest"
          >
            {isPushingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Pushing to Harvest...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Push All Ready ({readyTasks.length})</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={onAddTask}
            className="flex items-center space-x-1 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-[#e6edf3] px-2.5 py-1.5 font-medium transition-colors"
            title="Adicionar tarefa manual sem commits"
          >
            <Plus className="w-3 h-3 text-[#2f81f7]" />
            <span>+ Manual Task</span>
          </button>

          {tasks.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Tem a certeza que deseja limpar as tarefas desta bancada?')) {
                  onClearTasks();
                }
              }}
              className="p-1.5 text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
              title="Limpar tarefas da bancada"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task List / Canvas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0d1117]">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs font-mono text-[#8b949e] border border-dashed border-[#30363d]">
            <Sparkles className="w-8 h-8 text-[#ff6c37] mb-3 opacity-80" />
            <span className="text-sm font-semibold text-[#e6edf3] mb-1">
              Bancada de Tarefas Vazia
            </span>
            <p className="max-w-md text-xs text-[#8b949e] leading-relaxed mb-4">
              1. Selecione os seus commits técnicos no painel esquerdo.
              <br />
              2. Clique em <strong className="text-[#ff6c37]">"Transform Selected"</strong> para agrupar e gerar tarefas executivas em <strong>inglês de negócios</strong>.
              <br />
              3. Pode traduzir tarefas a qualquer momento com o botão <strong className="text-[#2f81f7]">"Traduzir (EN ⇄ PT)"</strong>.
              <br />
              4. Associe os projetos do Harvest e clique em <strong className="text-[#238636]">"Push All Ready"</strong>.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={onAddTask}
                className="px-3 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] text-[#e6edf3] text-xs font-mono flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#2f81f7]" />
                Criar Tarefa Manual
              </button>
            </div>
          </div>
        ) : (
          tasks.map((task, index) => {
            const selectedProject = projectAssignments.find(
              (p) => p.project.id === task.projectId
            );
            const availableTasks = selectedProject?.task_assignments || [];
            const isSynced = task.syncStatus === 'synced';
            const isSyncing = task.syncStatus === 'syncing';
            const hasError = task.syncStatus === 'error';
            const isTaskTranslating = translatingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`border bg-[#161b22] transition-colors ${
                  isSynced
                    ? 'border-[#238636]/50 bg-[#161b22]/90'
                    : hasError
                    ? 'border-[#f85149]'
                    : 'border-[#30363d]'
                }`}
              >
                {/* Card Top Bar (Postman Request Inspector Header) */}
                <div className="bg-[#0d1117] px-3 py-1.5 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Task Index + Linked Commit SHAs */}
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-xs font-mono font-bold text-[#ff6c37]">
                      TASK #{String(index + 1).padStart(2, '0')}
                    </span>

                    {task.sourceCommitShas.length > 0 ? (
                      <div className="flex items-center space-x-1 overflow-x-auto">
                        <span className="text-[10px] text-[#8b949e] font-mono">
                          Commits:
                        </span>
                        {task.sourceCommitShas.map((sha) => (
                          <span
                            key={sha}
                            className="bg-[#21262d] border border-[#30363d] px-1 py-0.2 text-[10px] font-mono text-[#2f81f7]"
                            title={sha}
                          >
                            {sha.substring(0, 7)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8b949e] px-1 py-0.2 bg-[#21262d] border border-[#30363d]">
                        MANUAL
                      </span>
                    )}
                  </div>

                  {/* Right: Date, Hours, Translate, Push Button & Delete */}
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    {/* Date Input */}
                    <div className="flex items-center space-x-1 bg-[#161b22] border border-[#30363d] px-1.5 py-0.5">
                      <Calendar className="w-3 h-3 text-[#8b949e]" />
                      <input
                        type="date"
                        value={task.spentDate}
                        onChange={(e) =>
                          onUpdateTask(task.id, { spentDate: e.target.value })
                        }
                        className="bg-transparent text-[#e6edf3] text-xs font-mono w-28 outline-none"
                      />
                    </div>

                    {/* Hours Input */}
                    <div className="flex items-center space-x-1 bg-[#161b22] border border-[#30363d] px-1.5 py-0.5">
                      <Clock className="w-3 h-3 text-[#8b949e]" />
                      <input
                        type="number"
                        step="0.25"
                        min="0.1"
                        max="24"
                        value={task.hours}
                        onChange={(e) =>
                          onUpdateTask(task.id, {
                            hours: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 bg-transparent text-right font-mono text-xs text-[#e6edf3] outline-none"
                      />
                      <span className="text-[#8b949e] text-xs font-mono">h</span>
                    </div>

                    {/* Individual Task Translate Button */}
                    <button
                      type="button"
                      onClick={() => onTranslateTask(task.id)}
                      disabled={isTaskTranslating || isSynced}
                      className="flex items-center space-x-1 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#2f81f7] text-[#e6edf3] text-[11px] font-mono transition-colors disabled:opacity-40"
                      title="Traduzir esta tarefa entre Inglês e Português"
                    >
                      {isTaskTranslating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[#ff6c37]" />
                          <span>Traduzindo...</span>
                        </>
                      ) : (
                        <>
                          <Languages className="w-3 h-3 text-[#2f81f7]" />
                          <span>Traduzir EN ⇄ PT</span>
                        </>
                      )}
                    </button>

                    {/* Individual Push to Harvest Button / Status */}
                    {isSynced ? (
                      <span className="flex items-center space-x-1 bg-[#238636]/20 border border-[#238636] text-[#238636] px-2 py-0.5 text-xs font-mono font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>SYNCED</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onPushTaskToHarvest(task)}
                        disabled={
                          isSyncing || !task.projectId || !task.taskId || task.hours <= 0
                        }
                        className="flex items-center space-x-1 bg-[#238636] hover:bg-[#2ea043] text-white px-2.5 py-1 text-xs font-medium uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={
                          !task.projectId || !task.taskId
                            ? 'Selecione o Projeto e a Categoria de Tarefa do Harvest primeiro'
                            : 'Enviar esta entrada individual para o Harvest'
                        }
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>SYNCING</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>SYNC</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete Task */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
                      title="Eliminar tarefa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Harvest Routing Row (2 Columns: Project & Task Category) */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#30363d] border-b border-[#30363d] bg-[#161b22]">
                  {/* Col 1: Harvest Project Selector */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                      <span className="flex items-center space-x-1">
                        <Briefcase className="w-3 h-3 text-[#2f81f7]" />
                        <span>HARVEST PROJECT:</span>
                      </span>
                      {task.projectId && task.taskId && (
                        <button
                          onClick={() =>
                            onApplyProjectToAll(task.projectId!, task.taskId!)
                          }
                          className="text-[#2f81f7] hover:underline flex items-center space-x-0.5 text-[10px]"
                          title="Aplicar este Projeto e Categoria a todas as tarefas da lista"
                        >
                          <span>Aplicar a todas</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        value={task.projectId || ''}
                        onChange={(e) => {
                          const newProjectId = parseInt(e.target.value, 10);
                          const proj = projectAssignments.find(
                            (p) => p.project.id === newProjectId
                          );
                          const defaultTask = proj?.task_assignments?.[0]?.task?.id || null;
                          onUpdateTask(task.id, {
                            projectId: newProjectId || null,
                            taskId: defaultTask,
                          });
                        }}
                        className="w-full bg-[#0d1117] border border-[#30363d] px-2 py-1 text-xs font-mono text-[#e6edf3] cursor-pointer appearance-none truncate pr-6"
                      >
                        <option value="" disabled>
                          {isLoadingProjects
                            ? 'A carregar projetos do Harvest...'
                            : '-- Selecionar Projeto Harvest --'}
                        </option>
                        {projectAssignments.map((pa) => (
                          <option key={pa.project.id} value={pa.project.id}>
                            {pa.client.name} — {pa.project.name} ({pa.project.code || 'ID:' + pa.project.id})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-2 pointer-events-none text-[#8b949e] text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Harvest Task Category Selector */}
                  <div className="p-2 space-y-1">
                    <div className="text-[11px] font-mono text-[#8b949e] flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-[#ff6c37]" />
                      <span>TASK CATEGORY:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={task.taskId || ''}
                        onChange={(e) =>
                          onUpdateTask(task.id, {
                            taskId: parseInt(e.target.value, 10) || null,
                          })
                        }
                        disabled={!task.projectId || availableTasks.length === 0}
                        className="w-full bg-[#0d1117] border border-[#30363d] px-2 py-1 text-xs font-mono text-[#e6edf3] cursor-pointer appearance-none truncate pr-6 disabled:opacity-40"
                      >
                        <option value="" disabled>
                          {!task.projectId
                            ? '(Selecione um projeto primeiro)'
                            : availableTasks.length === 0
                            ? '(Sem categorias disponíveis)'
                            : '-- Selecionar Categoria --'}
                        </option>
                        {availableTasks.map((ta) => (
                          <option key={ta.task.id} value={ta.task.id}>
                            {ta.task.name} {ta.billable ? '[$]' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-2 pointer-events-none text-[#8b949e] text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payload Body Editor */}
                <div className="p-3 space-y-2 bg-[#161b22]">
                  {/* Business Title */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider block">
                        Executive Business Title (Harvest Note)
                      </label>
                      <span className="text-[10px] font-mono text-[#8b949e]">
                        EN / PT
                      </span>
                    </div>
                    <input
                      type="text"
                      value={task.businessTitle}
                      onChange={(e) =>
                        onUpdateTask(task.id, { businessTitle: e.target.value })
                      }
                      placeholder="e.g. Data Export Module & Reporting Optimization..."
                      className="w-full bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 text-sm font-medium text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7] outline-none"
                    />
                  </div>

                  {/* Non-Technical Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider block">
                        Non-Technical Description & Deliverables
                      </label>
                      <span className="text-[10px] font-mono text-[#8b949e]">
                        {task.businessDescription.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={task.businessDescription}
                      onChange={(e) =>
                        onUpdateTask(task.id, {
                          businessDescription: e.target.value,
                        })
                      }
                      placeholder="Describe the business deliverable, user value, and operational scope without raw code jargon..."
                      className="w-full bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7] leading-relaxed resize-y outline-none"
                    />
                  </div>

                  {/* Error Notification if sync failed */}
                  {hasError && task.syncError && (
                    <div className="p-2 bg-[#f85149]/10 border border-[#f85149]/50 text-[#f85149] text-xs font-mono flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{task.syncError}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};
