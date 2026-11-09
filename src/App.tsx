import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ApiCredentials,
  ConnectionStatus,
  DateRange,
  GitHubBranch,
  GitHubCommit,
  GitHubRepo,
  HarvestProjectAssignment,
  TelemetryLog,
  WorkbenchTask,
} from './types';
import { storageService } from './services/storageService';
import { GitHubService } from './services/githubService';
import { GeminiService } from './services/geminiService';
import { HarvestService } from './services/harvestService';
import {
  SAMPLE_BRANCHES,
  SAMPLE_COMMITS,
  SAMPLE_PROJECT_ASSIGNMENTS,
  SAMPLE_REPOS,
} from './services/sampleData';
import { TopBar } from './components/TopBar';
import { CommitExplorer } from './components/CommitExplorer';
import { TaskWorkbench } from './components/TaskWorkbench';
import { SettingsModal } from './components/SettingsModal';
import { StatusBar } from './components/StatusBar';
import { translateFallback } from './services/translationHelper';

export function App() {
  // Credentials & Settings Modal
  const [credentials, setCredentials] = useState<ApiCredentials>(() =>
    storageService.getCredentials()
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingConnections, setIsTestingConnections] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    github: 'idle',
    gemini: 'idle',
    harvest: 'idle',
  });
  const [currentGithubUser, setCurrentGithubUser] = useState<string>(() =>
    storageService.getGithubUser()
  );

  // Author to filter commits by (defaults to authenticated GitHub user)
  const effectiveAuthor = useMemo(() => {
    if (credentials.githubAuthorFilter?.trim()) {
      return credentials.githubAuthorFilter.trim();
    }
    return currentGithubUser || connectionStatus.githubUser || storageService.getGithubUser();
  }, [credentials.githubAuthorFilter, currentGithubUser, connectionStatus.githubUser]);

  // Demo mode active when no credentials or toggled by user
  const hasLiveKeys = Boolean(
    credentials.githubToken || credentials.geminiApiKey || credentials.harvestAccessToken
  );
  const [isDemoMode, setIsDemoMode] = useState(!hasLiveKeys);

  // Date Range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10);
    return {
      preset: 'last_7_days',
      startDate: sevenDaysAgo,
      endDate: today,
    };
  });

  // GitHub State
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [selectedCommitShas, setSelectedCommitShas] = useState<Set<string>>(new Set());

  // Harvest State
  const [projectAssignments, setProjectAssignments] = useState<HarvestProjectAssignment[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Synced SHAs tracking
  const [syncedShas, setSyncedShas] = useState<Set<string>>(() => storageService.getSyncedShas());

  // Workbench Tasks State
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [generationLanguage, setGenerationLanguage] = useState<'en' | 'pt'>('en');
  const [translatingTaskId, setTranslatingTaskId] = useState<string | null>(null);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Telemetry Log Console
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString('pt-PT'),
      level: 'info',
      message: 'Commit2Harvest Workbench inicializado. Pronto para transformar commits.',
      statusCode: '200 OK',
      endpoint: 'CLIENT',
    },
  ]);

  const addLog = useCallback(
    (level: TelemetryLog['level'], message: string, statusCode?: number | string, endpoint?: string) => {
      const newLog: TelemetryLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('pt-PT'),
        level,
        message,
        statusCode,
        endpoint,
      };
      setTelemetryLogs((prev) => [...prev, newLog]);
    },
    []
  );

  // Test connections to GitHub, Gemini, and Harvest
  const handleTestConnections = useCallback(
    async (credsToTest?: ApiCredentials) => {
      const activeCreds = credsToTest || credentials;
      setIsTestingConnections(true);
      addLog('info', 'A testar credenciais e conectividade com as APIs...', undefined, 'TEST_ALL');

      const nextStatus: ConnectionStatus = { ...connectionStatus };

      // 1. Test GitHub
      if (activeCreds.githubToken) {
        nextStatus.github = 'testing';
        setConnectionStatus({ ...nextStatus });
        const gh = new GitHubService(activeCreds.githubToken);
        const ghResult = await gh.testConnection();
        if (ghResult.success) {
          nextStatus.github = 'connected';
          nextStatus.githubUser = ghResult.username;
          if (ghResult.username) {
            storageService.saveGithubUser(ghResult.username);
            setCurrentGithubUser(ghResult.username);
          }
          addLog('success', `GitHub API autenticado como @${ghResult.username}`, 200, 'GET /user');
        } else {
          nextStatus.github = 'error';
          addLog('error', `Falha GitHub: ${ghResult.error}`, 401, 'GET /user');
        }
      } else {
        nextStatus.github = 'disconnected';
      }

      // 2. Test Gemini
      if (activeCreds.geminiApiKey) {
        nextStatus.gemini = 'testing';
        setConnectionStatus({ ...nextStatus });
        const gemini = new GeminiService(activeCreds.geminiApiKey);
        const gemResult = await gemini.testConnection();
        if (gemResult.success) {
          nextStatus.gemini = 'connected';
          addLog('success', `Google Gemini API conectado (${gemResult.modelName})`, 200, 'GET /models');
        } else {
          nextStatus.gemini = 'error';
          addLog('error', `Falha Gemini: ${gemResult.error}`, 400, 'GEMINI /models');
        }
      } else {
        nextStatus.gemini = 'disconnected';
      }

      // 3. Test Harvest
      if (activeCreds.harvestAccountId && activeCreds.harvestAccessToken) {
        nextStatus.harvest = 'testing';
        setConnectionStatus({ ...nextStatus });
        const harvest = new HarvestService(
          activeCreds.harvestAccountId,
          activeCreds.harvestAccessToken
        );
        const hvResult = await harvest.testConnection();
        if (hvResult.success) {
          nextStatus.harvest = 'connected';
          nextStatus.harvestUser = hvResult.userName;
          addLog('success', `Harvest v2 API conectado (${hvResult.userName})`, 200, 'GET /v2/users/me');
        } else {
          nextStatus.harvest = 'error';
          addLog('error', `Falha Harvest: ${hvResult.error}`, 401, 'GET /v2/users/me');
        }
      } else {
        nextStatus.harvest = 'disconnected';
      }

      setConnectionStatus(nextStatus);
      setIsTestingConnections(false);
    },
    [credentials, connectionStatus, addLog]
  );

  // Save credentials from Settings
  const handleSaveCredentials = (newCreds: ApiCredentials) => {
    storageService.saveCredentials(newCreds);
    setCredentials(newCreds);
    addLog('info', 'Credenciais guardadas no localStorage', undefined, 'STORAGE');
    if (newCreds.githubToken || newCreds.geminiApiKey || newCreds.harvestAccessToken) {
      setIsDemoMode(false);
    }
  };

  // Toggle demo mode
  const handleToggleDemoMode = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);
    addLog(
      'info',
      nextMode
        ? 'Modo DEMO ativado com dados de exemplo (Saudigitus Helpdesk)'
        : 'Modo AO VIVO ativado',
      undefined,
      'MODE'
    );
  };

  // Load Repositories and Harvest Projects
  useEffect(() => {
    const initializeData = async () => {
      // 1. Projects
      if (!isDemoMode && credentials.harvestAccountId && credentials.harvestAccessToken) {
        setIsLoadingProjects(true);
        try {
          const harvest = new HarvestService(
            credentials.harvestAccountId,
            credentials.harvestAccessToken
          );
          const assignments = await harvest.fetchProjectAssignments();
          setProjectAssignments(assignments);
          addLog(
            'success',
            `${assignments.length} projetos carregados do Harvest`,
            200,
            'GET /v2/project_assignments'
          );
        } catch (err: any) {
          addLog('error', err.message, 500, 'GET /v2/project_assignments');
          setProjectAssignments(SAMPLE_PROJECT_ASSIGNMENTS);
        } finally {
          setIsLoadingProjects(false);
        }
      } else {
        setProjectAssignments(SAMPLE_PROJECT_ASSIGNMENTS);
      }

      // 2. Repositories
      if (!isDemoMode && credentials.githubToken) {
        try {
          const gh = new GitHubService(credentials.githubToken);

          // Auto-detect GitHub authenticated user identity
          try {
            const user = await gh.getAuthenticatedUser();
            if (user.login) {
              setCurrentGithubUser(user.login);
              storageService.saveGithubUser(user.login);
              setConnectionStatus((prev) => ({
                ...prev,
                github: 'connected',
                githubUser: user.login,
              }));
              addLog('info', `GitHub autenticado como @${user.login}`, 200, 'GET /user');
            }
          } catch (userErr: any) {
            console.warn('Could not auto-fetch GitHub user profile:', userErr);
          }

          const repoList = await gh.fetchRepositories();
          setRepos(repoList);
          addLog('success', `${repoList.length} repositórios GitHub carregados`, 200, 'GET /user/repos');
          if (repoList.length > 0) {
            const lastSaved = storageService.getLastSelectedRepo();
            const matchedRepo = repoList.find((r) => r.full_name === lastSaved.repo);
            setSelectedRepo(matchedRepo ? matchedRepo.full_name : repoList[0].full_name);
          }
        } catch (err: any) {
          addLog('error', err.message, 500, 'GET /user/repos');
          setRepos(SAMPLE_REPOS);
          setSelectedRepo(SAMPLE_REPOS[0].full_name);
        }
      } else {
        setRepos(SAMPLE_REPOS);
        setSelectedRepo(SAMPLE_REPOS[0].full_name);
      }
    };

    initializeData();
  }, [isDemoMode, credentials.githubToken, credentials.harvestAccountId, credentials.harvestAccessToken, addLog]);

  // When selected repository changes, load its branches
  useEffect(() => {
    if (!selectedRepo) return;

    storageService.saveLastSelectedRepo(selectedRepo);

    if (isDemoMode) {
      setBranches(SAMPLE_BRANCHES);
      setSelectedBranch('main');
      return;
    }

    const [owner, repo] = selectedRepo.split('/');
    if (!owner || !repo) return;

    const loadBranches = async () => {
      try {
        const gh = new GitHubService(credentials.githubToken);
        const branchList = await gh.fetchBranches(owner, repo);
        setBranches(branchList);
        if (branchList.length > 0) {
          const defaultBranch =
            branchList.find((b) => b.name === 'main' || b.name === 'master')?.name ||
            branchList[0].name;
          setSelectedBranch(defaultBranch);
        }
      } catch (err: any) {
        addLog('warn', `Branches de fallback para ${selectedRepo}: ${err.message}`);
        setBranches(SAMPLE_BRANCHES);
        setSelectedBranch('main');
      }
    };

    loadBranches();
  }, [selectedRepo, isDemoMode, credentials.githubToken, addLog]);

  // Load commits when repo, branch, or dateRange changes
  const loadCommits = useCallback(async () => {
    if (!selectedRepo) return;

    setIsLoadingCommits(true);
    addLog(
      'info',
      `A procurar commits de @${effectiveAuthor || 'mim'} em ${selectedRepo} (${selectedBranch})...`,
      undefined,
      'GET /commits'
    );

    if (isDemoMode) {
      // Simulate realistic network delay
      setTimeout(() => {
        setCommits(SAMPLE_COMMITS);
        // Pre-select unsynced commits
        const currentSynced = storageService.getSyncedShas();
        const defaultSelected = new Set(
          SAMPLE_COMMITS.filter((c) => !currentSynced.has(c.sha)).map((c) => c.sha)
        );
        setSelectedCommitShas(defaultSelected);
        setIsLoadingCommits(false);
        addLog(
          'success',
          `${SAMPLE_COMMITS.length} commits próprios carregados (Modo Demonstração)`,
          200,
          'GET /commits'
        );
      }, 350);
      return;
    }

    const [owner, repo] = selectedRepo.split('/');
    if (!owner || !repo) {
      setIsLoadingCommits(false);
      return;
    }

    try {
      const gh = new GitHubService(credentials.githubToken);

      // If author is not yet resolved, fetch user profile first
      let authorToUse = effectiveAuthor;
      if (!authorToUse) {
        try {
          const u = await gh.getAuthenticatedUser();
          if (u.login) {
            authorToUse = u.login;
            setCurrentGithubUser(u.login);
            storageService.saveGithubUser(u.login);
            setConnectionStatus((prev) => ({
              ...prev,
              github: 'connected',
              githubUser: u.login,
            }));
          }
        } catch {
          // ignore
        }
      }

      const isoSince = `${dateRange.startDate}T00:00:00Z`;
      const isoUntil = `${dateRange.endDate}T23:59:59Z`;

      const fetchedCommits = await gh.fetchCommits({
        owner,
        repo,
        branch: selectedBranch,
        since: isoSince,
        until: isoUntil,
        author: authorToUse || undefined,
      });

      // Strict client-side check to guarantee only the user's commits are shown
      const strictlyMyCommits = authorToUse
        ? fetchedCommits.filter((c) => {
            const target = authorToUse.toLowerCase();
            const login = c.author?.login?.toLowerCase() || '';
            const name = c.commit.author?.name?.toLowerCase() || '';
            const email = c.commit.author?.email?.toLowerCase() || '';
            return (
              login === target ||
              name === target ||
              name.includes(target) ||
              email.includes(target)
            );
          })
        : fetchedCommits;

      setCommits(strictlyMyCommits);
      const currentSynced = storageService.getSyncedShas();
      const defaultSelected = new Set(
        strictlyMyCommits.filter((c) => !currentSynced.has(c.sha)).map((c) => c.sha)
      );
      setSelectedCommitShas(defaultSelected);
      addLog(
        'success',
        `${strictlyMyCommits.length} commits próprios obtidos de ${selectedRepo} (autor: @${authorToUse || 'utilizador'})`,
        200,
        'GET /commits'
      );
    } catch (err: any) {
      addLog('error', err.message, 500, 'GET /commits');
      // If error occurs, fallback to sample commits so developer isn't blocked
      setCommits(SAMPLE_COMMITS);
      const currentSynced = storageService.getSyncedShas();
      setSelectedCommitShas(
        new Set(SAMPLE_COMMITS.filter((c) => !currentSynced.has(c.sha)).map((c) => c.sha))
      );
    } finally {
      setIsLoadingCommits(false);
    }
  }, [
    selectedRepo,
    selectedBranch,
    dateRange,
    isDemoMode,
    credentials.githubToken,
    effectiveAuthor,
    addLog,
  ]);

  useEffect(() => {
    loadCommits();
  }, [loadCommits]);

  // Check repo mapping preset
  const activeMapping = useMemo(() => {
    if (!selectedRepo) return null;
    return storageService.getMappingForRepo(selectedRepo);
  }, [selectedRepo]);

  const activePresetText = useMemo(() => {
    if (!activeMapping) return undefined;
    const project = projectAssignments.find((p) => p.project.id === activeMapping.projectId);
    if (!project) return undefined;
    const task = project.task_assignments.find((t) => t.task.id === activeMapping.taskId);
    return `${project.project.name} → ${task?.task.name || 'Default'}`;
  }, [activeMapping, projectAssignments]);

  // Selection handlers
  const handleToggleCommitSelect = (sha: string) => {
    setSelectedCommitShas((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  };

  const handleSelectAllCommits = (shas: string[]) => {
    setSelectedCommitShas(new Set(shas));
  };

  const handleDeselectAllCommits = () => {
    setSelectedCommitShas(new Set());
  };

  // Check if sha is synced
  const isShaSynced = useCallback((sha: string) => syncedShas.has(sha), [syncedShas]);

  // Transform with Gemini Action
  const handleTransformWithGemini = async () => {
    const selectedCommits = commits.filter((c) => selectedCommitShas.has(c.sha));
    if (selectedCommits.length === 0) return;

    setIsTransforming(true);
    addLog(
      'info',
      `A enviar ${selectedCommits.length} commits para agrupamento e tradução com Gemini AI...`,
      undefined,
      'POST /gemini-2.5-flash'
    );

    try {
      let generatedItems;

      if (!isDemoMode && credentials.geminiApiKey) {
        const gemini = new GeminiService(credentials.geminiApiKey);
        generatedItems = await gemini.transformCommitsToTasks(
          selectedCommits,
          selectedRepo,
          generationLanguage
        );
      } else {
        // Fallback intelligent simulation
        await new Promise((r) => setTimeout(r, 900));

        // Group into 2 realistic executive tasks
        const exportCommits = selectedCommits.filter(
          (c) => c.commit.message.includes('export') || c.commit.message.includes('filter')
        );
        const securityCommits = selectedCommits.filter(
          (c) =>
            c.commit.message.includes('auth') ||
            c.commit.message.includes('deps') ||
            c.commit.message.includes('perf')
        );

        generatedItems = [];

        if (generationLanguage === 'en') {
          if (exportCommits.length > 0 || selectedCommits.length <= 2) {
            const sourceShas = (exportCommits.length > 0 ? exportCommits : selectedCommits).map(
              (c) => c.sha.substring(0, 7)
            );
            generatedItems.push({
              id: `task-ai-${Date.now()}-1`,
              businessTitle: 'Data Export Module & Report Streaming Optimization',
              businessDescription:
                'Implemented bulk Excel streaming export handlers and organizational unit filter validation to ensure system reliability under large datasets.',
              suggestedHours: 2.5,
              spentDate: dateRange.endDate,
              sourceCommitShas: sourceShas,
            });
          }

          if (securityCommits.length > 0 && selectedCommits.length > 2) {
            generatedItems.push({
              id: `task-ai-${Date.now()}-2`,
              businessTitle: 'Security Hardening & Session Access Control',
              businessDescription:
                'Integrated two-factor authentication (TOTP) into the login pipeline and proactively upgraded dependencies to meet security compliance standards.',
              suggestedHours: 2.0,
              spentDate: dateRange.startDate,
              sourceCommitShas: securityCommits.map((c) => c.sha.substring(0, 7)),
            });
          }

          if (generatedItems.length === 0) {
            generatedItems.push({
              id: `task-ai-${Date.now()}-1`,
              businessTitle: 'Continuous System Engineering & Defect Resolution',
              businessDescription:
                'Ongoing platform enhancements, verification of core business rules, and technical resolution of operational anomalies.',
              suggestedHours: 1.5,
              spentDate: dateRange.endDate,
              sourceCommitShas: selectedCommits.map((c) => c.sha.substring(0, 7)),
            });
          }
        } else {
          if (exportCommits.length > 0 || selectedCommits.length <= 2) {
            const sourceShas = (exportCommits.length > 0 ? exportCommits : selectedCommits).map(
              (c) => c.sha.substring(0, 7)
            );
            generatedItems.push({
              id: `task-ai-${Date.now()}-1`,
              businessTitle: 'Módulo de Exportação de Dados e Otimização de Relatórios',
              businessDescription:
                'Implementação do mecanismo de exportação em lote para formato Excel e correção nos filtros de unidades organizacionais, garantindo maior estabilidade no processamento de grandes volumes.',
              suggestedHours: 2.5,
              spentDate: dateRange.endDate,
              sourceCommitShas: sourceShas,
            });
          }

          if (securityCommits.length > 0 && selectedCommits.length > 2) {
            generatedItems.push({
              id: `task-ai-${Date.now()}-2`,
              businessTitle: 'Melhorias de Segurança e Controlo de Acessos',
              businessDescription:
                'Integração de verificação em duas etapas (TOTP) no fluxo de autenticação e atualização preventiva de dependências para reforço dos padrões de segurança.',
              suggestedHours: 2.0,
              spentDate: dateRange.startDate,
              sourceCommitShas: securityCommits.map((c) => c.sha.substring(0, 7)),
            });
          }

          if (generatedItems.length === 0) {
            generatedItems.push({
              id: `task-ai-${Date.now()}-1`,
              businessTitle: 'Manutenção Evolutiva e Correções no Sistema',
              businessDescription:
                'Desenvolvimento de melhorias contínuas, validação de regras de negócio e triagem de anomalias operacionais.',
              suggestedHours: 1.5,
              spentDate: dateRange.endDate,
              sourceCommitShas: selectedCommits.map((c) => c.sha.substring(0, 7)),
            });
          }
        }
      }

      // Check if current repository has default mapping
      const savedMap = storageService.getMappingForRepo(selectedRepo);
      const defaultProjId =
        savedMap?.projectId || projectAssignments[0]?.project?.id || null;
      const defaultProj = projectAssignments.find((p) => p.project.id === defaultProjId);
      const defaultTaskId =
        savedMap?.taskId || defaultProj?.task_assignments?.[0]?.task?.id || null;

      const newWorkbenchTasks: WorkbenchTask[] = generatedItems.map((item) => ({
        id: item.id,
        businessTitle: item.businessTitle,
        businessDescription: item.businessDescription,
        spentDate: item.spentDate,
        hours: item.suggestedHours,
        projectId: defaultProjId,
        taskId: defaultTaskId,
        sourceCommitShas: item.sourceCommitShas,
        syncStatus: 'pending',
      }));

      setTasks((prev) => [...newWorkbenchTasks, ...prev]);
      addLog(
        'success',
        `Gemini gerou ${newWorkbenchTasks.length} tarefas de negócio estruturadas com sucesso!`,
        200,
        'GEMINI TRANSFORM COMPLETE'
      );
    } catch (err: any) {
      addLog('error', `Falha ao transformar com Gemini: ${err.message}`, 500, 'GEMINI_ERROR');
      alert(`Erro na tradução com Gemini: ${err.message}`);
    } finally {
      setIsTransforming(false);
    }
  };

  // Push individual task to Harvest
  const handlePushTaskToHarvest = async (task: WorkbenchTask) => {
    if (!task.projectId || !task.taskId) {
      alert('Selecione o Projeto e a Categoria de Tarefa do Harvest antes de enviar.');
      return;
    }

    // Set syncing status
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, syncStatus: 'syncing', syncError: undefined } : t))
    );

    const payload = {
      project_id: task.projectId,
      task_id: task.taskId,
      spent_date: task.spentDate,
      hours: task.hours,
      notes: `${task.businessTitle}: ${task.businessDescription}`,
    };

    addLog(
      'info',
      `A submeter entrada de ${task.hours}h para o Harvest...`,
      undefined,
      'POST /v2/time_entries'
    );

    try {
      let createdEntryId = Math.floor(Math.random() * 900000) + 100000;

      if (!isDemoMode && credentials.harvestAccountId && credentials.harvestAccessToken) {
        const harvest = new HarvestService(
          credentials.harvestAccountId,
          credentials.harvestAccessToken
        );
        const res = await harvest.createTimeEntry(payload);
        createdEntryId = res.id;
      } else {
        // Realistic simulation in demo mode
        await new Promise((r) => setTimeout(r, 600));
      }

      // Mark task as synced
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, syncStatus: 'synced', harvestEntryId: createdEntryId }
            : t
        )
      );

      // Save mapping memory for repository
      if (selectedRepo && task.projectId && task.taskId) {
        storageService.saveRepoProjectMapping(selectedRepo, task.projectId, task.taskId);
      }

      // Mark source commit SHAs as synced
      if (task.sourceCommitShas.length > 0) {
        storageService.markShasSynced(task.sourceCommitShas);
        setSyncedShas(storageService.getSyncedShas());
      }

      addLog(
        'success',
        `Entrada #${createdEntryId} criada com sucesso no Harvest (${task.hours}h em ${task.spentDate})`,
        201,
        'POST /v2/time_entries (201 Created)'
      );
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, syncStatus: 'error', syncError: err.message } : t
        )
      );
      addLog('error', `Falha ao enviar para o Harvest: ${err.message}`, 400, 'POST /v2/time_entries');
    }
  };

  // Push all ready tasks to Harvest
  const handlePushAllReadyToHarvest = async () => {
    const readyTasks = tasks.filter(
      (t) => t.syncStatus !== 'synced' && t.projectId && t.taskId && t.hours > 0
    );
    if (readyTasks.length === 0) return;

    setIsPushingAll(true);
    addLog(
      'info',
      `A iniciar submissão em lote de ${readyTasks.length} tarefas prontas...`,
      undefined,
      'BULK_DISPATCH'
    );

    let successCount = 0;
    for (const task of readyTasks) {
      try {
        await handlePushTaskToHarvest(task);
        successCount++;
      } catch (err) {
        console.error('Bulk item push failed', err);
      }
    }

    setIsPushingAll(false);
    addLog(
      'success',
      `Submissão em lote concluída: ${successCount} de ${readyTasks.length} tarefas integradas com sucesso!`,
      200,
      'BULK_COMPLETE'
    );
  };

  // Apply project and task category to all workbench tasks
  const handleApplyProjectToAll = (projectId: number, taskId: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.syncStatus === 'synced' ? t : { ...t, projectId, taskId }))
    );
    if (selectedRepo) {
      storageService.saveRepoProjectMapping(selectedRepo, projectId, taskId);
    }
    addLog('info', 'Projeto e categoria aplicados a todas as tarefas pendentes.', undefined, 'MAPPING');
  };

  // Task list management
  const handleUpdateTask = (id: string, updates: Partial<WorkbenchTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTask = () => {
    const savedMap = storageService.getMappingForRepo(selectedRepo);
    const defaultProjId = savedMap?.projectId || projectAssignments[0]?.project?.id || null;
    const defaultProj = projectAssignments.find((p) => p.project.id === defaultProjId);
    const defaultTaskId = savedMap?.taskId || defaultProj?.task_assignments?.[0]?.task?.id || null;

    const isEnglish = generationLanguage === 'en';
    const newTask: WorkbenchTask = {
      id: `task-manual-${Date.now()}`,
      businessTitle: isEnglish
        ? 'Specialized Engineering & Technical Consulting'
        : 'Desenvolvimento e Suporte Técnico Especializado',
      businessDescription: isEnglish
        ? 'Software engineering activities, technical architecture meetings, and platform support.'
        : 'Atividades de engenharia de software, reuniões técnicas e suporte aos utilizadores da plataforma.',
      spentDate: dateRange.endDate,
      hours: 1.0,
      projectId: defaultProjId,
      taskId: defaultTaskId,
      sourceCommitShas: [],
      syncStatus: 'pending',
    };

    setTasks((prev) => [newTask, ...prev]);
    addLog('info', 'Nova tarefa manual adicionada à bancada.', undefined, 'MANUAL_TASK');
  };

  // Translate individual task between EN and PT
  const handleTranslateTask = async (taskId: string, targetLanguage?: 'en' | 'pt') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Detect target language if not provided
    const isPortuguese =
      /[áéíóúãõçàâêô]/i.test(task.businessTitle + ' ' + task.businessDescription) ||
      /\b(de|do|da|para|com|em|relatório|otimização|correção|melhoria|desenvolvimento)\b/i.test(
        task.businessTitle
      );
    const target = targetLanguage || (isPortuguese ? 'en' : 'pt');

    setTranslatingTaskId(taskId);
    addLog(
      'info',
      `A traduzir tarefa #${task.id.slice(-4)} para ${target === 'en' ? 'Inglês' : 'Português'} com Gemini...`,
      undefined,
      'TRANSLATE'
    );

    try {
      if (!isDemoMode && credentials.geminiApiKey) {
        const gemini = new GeminiService(credentials.geminiApiKey);
        const translated = await gemini.translateTask(task, target);
        handleUpdateTask(taskId, {
          businessTitle: translated.businessTitle,
          businessDescription: translated.businessDescription,
        });
      } else {
        await new Promise((r) => setTimeout(r, 400));
        const translated = translateFallback(task.businessTitle, task.businessDescription, target);
        handleUpdateTask(taskId, {
          businessTitle: translated.title,
          businessDescription: translated.description,
        });
      }
      addLog(
        'success',
        `Tarefa traduzida para ${target === 'en' ? 'Inglês' : 'Português'} com sucesso!`,
        200,
        'TRANSLATE_OK'
      );
    } catch (err: any) {
      addLog('error', `Falha ao traduzir: ${err.message}`, 500, 'TRANSLATE_ERROR');
      alert(`Erro na tradução: ${err.message}`);
    } finally {
      setTranslatingTaskId(null);
    }
  };

  // Translate all tasks to target language
  const handleTranslateAllTasks = async (targetLanguage: 'en' | 'pt') => {
    if (tasks.length === 0) return;

    setIsTranslatingAll(true);
    addLog(
      'info',
      `A traduzir todas as ${tasks.length} tarefas para ${targetLanguage === 'en' ? 'Inglês' : 'Português'} com Gemini...`,
      undefined,
      'TRANSLATE_ALL'
    );

    try {
      if (!isDemoMode && credentials.geminiApiKey) {
        const gemini = new GeminiService(credentials.geminiApiKey);
        const translatedBatch = await gemini.translateTasks(tasks, targetLanguage);
        setTasks((prev) =>
          prev.map((t) => {
            const match = translatedBatch.find((res) => res.id === t.id);
            return match
              ? {
                  ...t,
                  businessTitle: match.businessTitle,
                  businessDescription: match.businessDescription,
                }
              : t;
          })
        );
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setTasks((prev) =>
          prev.map((t) => {
            const translated = translateFallback(
              t.businessTitle,
              t.businessDescription,
              targetLanguage
            );
            return {
              ...t,
              businessTitle: translated.title,
              businessDescription: translated.description,
            };
          })
        );
      }
      addLog(
        'success',
        `Todas as ${tasks.length} tarefas traduzidas para ${targetLanguage === 'en' ? 'Inglês' : 'Português'} com sucesso!`,
        200,
        'TRANSLATE_ALL_OK'
      );
    } catch (err: any) {
      addLog('error', `Falha na tradução em lote: ${err.message}`, 500, 'TRANSLATE_ERROR');
      alert(`Erro na tradução em lote: ${err.message}`);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleClearTasks = () => {
    setTasks([]);
    addLog('info', 'Bancada de tarefas limpa.', undefined, 'CLEAR_WORKBENCH');
  };

  const handleClearSyncedHistory = () => {
    storageService.clearSyncedShas();
    setSyncedShas(new Set());
    addLog('warn', 'Histórico de commits sincronizados limpo com sucesso.', undefined, 'CLEAR_SYNC');
  };

  const totalHours = useMemo(
    () => tasks.reduce((acc, t) => acc + (Number(t.hours) || 0), 0),
    [tasks]
  );
  const readyTaskCount = useMemo(
    () => tasks.filter((t) => t.syncStatus !== 'synced' && t.projectId && t.taskId && t.hours > 0).length,
    [tasks]
  );
  const syncedTaskCount = useMemo(
    () => tasks.filter((t) => t.syncStatus === 'synced').length,
    [tasks]
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] text-[#e6edf3] font-sans antialiased overflow-hidden select-none">
      {/* Top Environment & Utility Bar (48px / h-12) */}
      <TopBar
        connectionStatus={connectionStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activePresetText={activePresetText}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
      />

      {/* Main Split-Pane Workbench (100vh - 48px - 28px) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#30363d]">
        {/* Left Pane: GitHub Commit Explorer (45% width) */}
        <CommitExplorer
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={setSelectedRepo}
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          commits={commits}
          isLoadingCommits={isLoadingCommits}
          onRefreshCommits={loadCommits}
          selectedCommitShas={selectedCommitShas}
          onToggleCommitSelect={handleToggleCommitSelect}
          onSelectAllCommits={handleSelectAllCommits}
          onDeselectAllCommits={handleDeselectAllCommits}
          isShaSynced={isShaSynced}
          currentAuthor={effectiveAuthor}
        />

        {/* Right Pane: AI Task Mapper & Harvest Payload Builder (55% width) */}
        <TaskWorkbench
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onAddTask={handleAddTask}
          onClearTasks={handleClearTasks}
          onTransformWithGemini={handleTransformWithGemini}
          isTransforming={isTransforming}
          selectedCommitCount={selectedCommitShas.size}
          projectAssignments={projectAssignments}
          isLoadingProjects={isLoadingProjects}
          onPushTaskToHarvest={handlePushTaskToHarvest}
          onPushAllReadyToHarvest={handlePushAllReadyToHarvest}
          isPushingAll={isPushingAll}
          onApplyProjectToAll={handleApplyProjectToAll}
          generationLanguage={generationLanguage}
          onToggleGenerationLanguage={setGenerationLanguage}
          onTranslateTask={handleTranslateTask}
          onTranslateAllTasks={handleTranslateAllTasks}
          translatingTaskId={translatingTaskId}
          isTranslatingAll={isTranslatingAll}
        />
      </div>

      {/* Bottom Status & Telemetry Bar (28px / h-7) */}
      <StatusBar
        logs={telemetryLogs}
        selectedCommitCount={selectedCommitShas.size}
        totalHours={totalHours}
        readyTaskCount={readyTaskCount}
        syncedTaskCount={syncedTaskCount}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        credentials={credentials}
        onSaveCredentials={handleSaveCredentials}
        connectionStatus={connectionStatus}
        onTestConnections={handleTestConnections}
        isTesting={isTestingConnections}
        onClearSyncedHistory={handleClearSyncedHistory}
        syncedCount={syncedShas.size}
      />
    </div>
  );
}

export default App;
