import { GitHubCommit, GeminiTaskItem } from '../types';

interface ParsedCommit {
  sha: string;
  shortSha: string;
  type: string;
  scope?: string;
  subject: string;
  body: string;
  rawMessage: string;
  date: string;
  author: string;
}

/**
 * Splits camelCase or PascalCase strings into readable words:
 * e.g. "ModalEventContentUpdate" -> "Modal Event Content Update"
 * e.g. "CustomDhis2RulesEngine" -> "Custom DHIS2 Rules Engine"
 */
function splitCamelCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/Dhis2/g, 'DHIS2')
    .replace(/dhis2/g, 'DHIS2')
    .replace(/Totp/g, 'TOTP')
    .replace(/totp/g, 'TOTP')
    .replace(/Url/g, 'URL')
    .replace(/url/g, 'URL')
    .replace(/Api/g, 'API')
    .replace(/api/g, 'API')
    .replace(/Ui/g, 'UI')
    .replace(/ui/g, 'UI');
}

/**
 * Strips developer clutter like PR numbers, issue trackers (SEMIS-272), file extensions, etc.
 */
function cleanRawMessage(msg: string): string {
  return msg
    .replace(/(\(|\[)?(SEMIS|DHIS2|GH|JIRA|ISSUE)[-_ ]?\d+(\)|\])?/gi, '')
    .replace(/#\d+/g, '')
    .replace(/\b(d2\.config\.js|package\.json|tsconfig\.json|\.tsx?|\.jsx?|\.json|\.css|\.scss)\b/gi, (match) => {
      if (/config/i.test(match)) return 'configuration';
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses a GitHub commit into structured metadata
 */
export function parseCommit(commit: GitHubCommit): ParsedCommit {
  const fullMsg = commit.commit?.message || '';
  const lines = fullMsg.split('\n');
  const firstLine = cleanRawMessage(lines[0] || '');
  const body = lines.slice(1).join('\n').trim();

  // Match conventional commits: type(scope)?: message
  const match = firstLine.match(
    /^(feat|fix|refactor|perf|chore|style|docs|test|build|ci)(\(([^)]+)\))?(!)?:\s*(.+)$/i
  );

  let type = 'feat';
  let scope: string | undefined;
  let subject = firstLine;

  if (match) {
    type = match[1].toLowerCase();
    scope = match[3]?.trim();
    subject = match[5]?.trim() || '';
  } else {
    // Keyword heuristics if not conventional commit
    const lower = firstLine.toLowerCase();
    if (/\b(fix|resolve|correct|bug|patch|corrige|arruma)\b/i.test(lower)) {
      type = 'fix';
    } else if (/\b(refactor|restructure|clean|migrate|modernize|melhora)\b/i.test(lower)) {
      type = 'refactor';
    } else if (/\b(perf|speed|optimize|performance|desempenho)\b/i.test(lower)) {
      type = 'perf';
    } else if (/\b(chore|bump|license|licence|dependency|deps|build)\b/i.test(lower)) {
      type = 'chore';
    } else if (/\b(docs?|readme|documentation|documenta[çc][ãa]o)\b/i.test(lower)) {
      type = 'docs';
    } else if (/\b(style|format|lint|css|ui-review)\b/i.test(lower)) {
      type = 'style';
    } else {
      type = 'feat';
    }
  }

  const commitDate = commit.commit?.author?.date
    ? commit.commit.author.date.substring(0, 10)
    : new Date().toISOString().substring(0, 10);

  return {
    sha: commit.sha,
    shortSha: commit.sha.substring(0, 7),
    type,
    scope,
    subject: splitCamelCase(subject),
    body,
    rawMessage: fullMsg,
    date: commitDate,
    author: commit.commit?.author?.name || 'Developer',
  };
}

/**
 * Translates and elevates a parsed commit subject into a concise executive title
 */
export function generateExecutiveTitle(parsed: ParsedCommit, lang: 'en' | 'pt'): string {
  const isEn = lang === 'en';
  let subject = parsed.subject;

  // Clean common prefixes
  subject = subject
    .replace(/Custom\s*DHIS2\s*Rules\s*Engine/gi, 'DHIS2 Rules Engine')
    .replace(/Custom\s*Dhis2\s*Rules\s*Engine/gi, 'DHIS2 Rules Engine')
    .replace(/Modal\s*Event\s*Content\s*Update/gi, 'Event Modal')
    .replace(/Modal\s*Content\s*And\s*Date\s*Filter\s*Component/gi, 'Modal & Date Filter')
    .replace(/Date\s*Filter\s*Component/gi, 'Date Filter')
    .replace(/Keyboard\s*Date\s*Picker/gi, 'Keyboard DatePicker')
    .replace(/^(implement|adds?|added|create|created|setup|introduce)\s+/i, '')
    .replace(/^(integrate|integrated|integrating)\s+/i, 'Integration of ')
    .replace(/^(update|updated|updating|enhance|enhanced)\s+/i, '')
    .replace(/^(exclude|excluded|remove|removed)\s+/i, 'Exclusion of ')
    .replace(/^(fix|fixed|resolve|resolved)\s+/i, 'Resolution of ')
    .replace(/^(migrate|migrated)\s+/i, 'Migration of ')
    .replace(/^(apply|applied)\s+/i, '')
    .trim();

  // If scope exists and is not in subject, include it
  let titleCore = subject;
  if (parsed.scope && !new RegExp(parsed.scope, 'i').test(titleCore)) {
    const formattedScope = parsed.scope.charAt(0).toUpperCase() + parsed.scope.slice(1);
    titleCore = `${formattedScope} - ${titleCore}`;
  }

  // Capitalize words for title casing
  const titleCased = titleCore
    .split(' ')
    .map((w, idx) => {
      const lower = w.toLowerCase();
      if (
        idx > 0 &&
        ['and', 'with', 'for', 'to', 'in', 'of', 'on', 'via', 'by', 'e', 'de', 'do', 'da', 'para', 'com'].includes(lower)
      ) {
        return lower;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (isEn) {
    if (parsed.type === 'fix' && !/fix|resolution|correction|stabilization/i.test(titleCased)) {
      return `${titleCased} Fix`;
    }
    return titleCased || 'Platform Workflow & Feature Delivery';
  } else {
    // Portuguese Title
    const ptTitle = translateTitleToPT(titleCased, parsed.type);
    return ptTitle || 'Desenvolvimento e Melhoria da Plataforma';
  }
}

/**
 * Helper to translate common title phrases to executive Portuguese
 */
function translateTitleToPT(enTitle: string, type: string): string {
  let res = enTitle
    .replace(/\bIntegration of\b/gi, 'Integração de')
    .replace(/\bEvent Details Modal\b/gi, 'Modal de Detalhes do Evento')
    .replace(/\bEvent Modal\b/gi, 'Modal de Eventos')
    .replace(/\bInto\b/gi, 'na')
    .replace(/\bRow[- ]Click Integration\b/gi, 'Seleção por Clique na Linha')
    .replace(/\bReactivate Event Hook\b/gi, 'Sincronização de Eventos')
    .replace(/\bCustom DHIS2 Rules Engine\b/gi, 'Motor de Regras DHIS2')
    .replace(/\bDate Filter(ing)?\b/gi, 'Filtragem por Data')
    .replace(/\bDate Range\b/gi, 'Intervalo Temporal')
    .replace(/\bDatePicker\b/gi, 'Seletor de Datas')
    .replace(/\bEnrollment Content Filters\b/gi, 'Filtros de Inscrição')
    .replace(/\bExclude DATE Type Columns\b/gi, 'Exclusão de Colunas de Data')
    .replace(/\bExcel Export\b/gi, 'Exportação para Excel')
    .replace(/\bStudent Profile\b/gi, 'Perfil do Estudante')
    .replace(/\bAbsence Calculation\b/gi, 'Cálculo de Assiduidade e Faltas')
    .replace(/\bStatus Badges\b/gi, 'Indicadores de Estado')
    .replace(/\bMulti[- ]Factor TOTP Verification\b/gi, 'Verificação em Dois Passos (TOTP)')
    .replace(/\bAuthentication Pipeline\b/gi, 'Fluxo de Autenticação')
    .replace(/\bLicence\b|\bLicense\b/gi, 'Licenciamento e Governança')
    .replace(/\bAnd\b/gi, 'e')
    .replace(/\bWith\b/gi, 'com')
    .replace(/\bFor\b/gi, 'para')
    .replace(/\bVia\b/gi, 'via')
    .replace(/\bIn\b/gi, 'em')
    .replace(/\bOf\b/gi, 'de');

  if (type === 'fix' && !/correção|resolução|ajuste/i.test(res)) {
    res = `Correção: ${res}`;
  }

  return res.charAt(0).toUpperCase() + res.slice(1);
}

/**
 * Generates an executive Harvest timesheet description.
 * STRICT CONSTRAINT: 1 to 2 lines (approx 80 - 180 characters), clear, direct, and focused on business value.
 */
export function generateElevatedDescription(
  commits: GitHubCommit[],
  lang: 'en' | 'pt' = 'en'
): string {
  if (!commits || commits.length === 0) {
    return lang === 'en'
      ? 'Implemented requested functional adjustments and maintained platform operational stability.'
      : 'Implementação de ajustes funcionais solicitados e manutenção da estabilidade operacional.';
  }

  const isEn = lang === 'en';
  const parsed = parseCommit(commits[0]);
  const raw = parsed.subject.toLowerCase();

  // 1. Specific known features (1 to 2 lines max)
  if (/customdhis2rulesengine|rules engine/i.test(raw)) {
    if (/onassign/i.test(raw)) {
      return isEn
        ? 'Enhanced DHIS2 business rules engine with onAssign callback support to automate dynamic field assignments across event forms.'
        : 'Otimização do motor de regras DHIS2 com suporte a callbacks onAssign para automação de atribuições de campos na modal.';
    }
    return isEn
      ? 'Integrated DHIS2 dynamic business rules engine into the event modal workflow to ensure automated validation consistency.'
      : 'Integração do motor de regras dinâmicas DHIS2 na modal de eventos para garantir a validação automática das regras de negócio.';
  }

  if (/event details modal|modal.*event details|modal.*details/i.test(raw)) {
    return isEn
      ? 'Implemented interactive event details modal with row-click selection and real-time hook synchronization to streamline record inspection.'
      : 'Implementação da modal de detalhes do evento com seleção por clique na linha e sincronização em tempo real para consulta rápida de dados.';
  }

  if (/exclude date type|date.*content filter/i.test(raw)) {
    return isEn
      ? 'Corrected enrollment content filters by properly handling date-type columns, eliminating filter anomalies and ensuring accurate search results.'
      : 'Correção dos filtros de inscrição através do tratamento adequado de colunas de data, eliminando anomalias na pesquisa de registos.';
  }

  if (/date filter|datepicker|persistent date/i.test(raw)) {
    return isEn
      ? 'Integrated calendar date range filtering with URL parameter persistence to standardize temporal record filtering across views.'
      : 'Implementação de filtro por intervalo de datas com persistência nos parâmetros do URL para padronizar consultas temporais.';
  }

  if (/d2\.config|application name/i.test(raw)) {
    return isEn
      ? 'Updated application manifest configuration and system descriptions to improve platform clarity and metadata alignment.'
      : 'Atualização das configurações do manifesto da aplicação e descrição do sistema para maior clareza e alinhamento de metadados.';
  }

  if (/terminology|"nova receita"|"nova de receita"/i.test(raw)) {
    return isEn
      ? "Standardized user-facing terminology to 'Nova Receita' across form headers and navigation menus for visual consistency."
      : "Padronização da terminologia da aplicação para 'Nova Receita' nos cabeçalhos e menus de navegação para maior consistência visual.";
  }

  if (/absence|attendance/i.test(raw)) {
    return isEn
      ? 'Corrected student absence calculation logic based on status keys, ensuring reliable and accurate attendance reporting.'
      : 'Correção da lógica de apuramento de assiduidade e faltas de estudantes com base nas chaves de estado para relatórios precisos.';
  }

  if (/profile from.*metadata|program metadata/i.test(raw)) {
    return isEn
      ? 'Configured automatic student profile generation from program metadata to streamline record enrollment workflows.'
      : 'Configuração da geração automática de perfis a partir dos metadados do programa para agilizar as inscrições.';
  }

  if (/image upload|avatar/i.test(raw)) {
    return isEn
      ? 'Added user profile image upload functionality with enhanced avatar rendering across dashboard record summaries.'
      : 'Implementado carregamento de fotografias de perfil e melhoria na exibição dos avatares nos resumos da plataforma.';
  }

  if (/i18n|internationaliz/i.test(raw)) {
    return isEn
      ? 'Implemented internationalization support by replacing hardcoded UI labels with localized translation keys.'
      : 'Implementação de suporte a internacionalização com substituição de textos fixos por chaves de tradução multilíngue.';
  }

  if (/licence|license|bsd/i.test(raw)) {
    return isEn
      ? 'Formalized repository compliance with BSD 3-Clause licensing, author governance, and cleaned diagnostic debug logs.'
      : 'Formalização de conformidade com licenciamento BSD 3-Clause, governança de autoria e limpeza de logs de depuração.';
  }

  // 2. Generic high-level concise elevation (1 to 2 lines)
  const cleanSubject = parsed.subject
    .replace(/^(feat|fix|refactor|perf|chore|style|docs|test):\s*/i, '')
    .trim();

  if (parsed.type === 'fix') {
    return isEn
      ? `Resolved operational defect in ${cleanSubject}, ensuring platform data integrity and uninterrupted user workflows.`
      : `Correção de anomalia relativa a ${cleanSubject}, assegurando integridade dos dados e continuidade operacional.`;
  }

  if (parsed.type === 'refactor') {
    return isEn
      ? `Refactored ${cleanSubject} to optimize code architecture, improving response times and long-term maintainability.`
      : `Refatoração de ${cleanSubject} para otimizar a arquitetura e melhorar a resposta dos fluxos de trabalho.`;
  }

  if (parsed.type === 'perf') {
    return isEn
      ? `Optimized system throughput and query performance for ${cleanSubject}, reducing latency for end users.`
      : `Otimização de desempenho e tempo de resposta para ${cleanSubject}, aumentando a fluidez da plataforma.`;
  }

  // Default feat / delivery (1-2 lines)
  return isEn
    ? `Delivered ${cleanSubject}, expanding user capabilities and streamlining operational tasks across the platform.`
    : `Implementação de ${cleanSubject}, entregando novas funcionalidades aos utilizadores e melhorando a usabilidade.`;
}

/**
 * Evaluates the technical complexity and effort weight of a commit
 * Returns a weight between 0.5 (minor chore/typo) to 4.5 (major architecture/complex feature)
 */
export function calculateCommitComplexity(commit: GitHubCommit, parsed?: ParsedCommit): number {
  const p = parsed || parseCommit(commit);
  const raw = (p.rawMessage || '').toLowerCase();

  let weight = 2.0;

  // 1. Base weight by conventional commit type
  switch (p.type) {
    case 'feat':
      weight = 3.0;
      break;
    case 'refactor':
      weight = 2.5;
      break;
    case 'perf':
      weight = 2.5;
      break;
    case 'fix':
      weight = 1.75;
      break;
    case 'test':
      weight = 1.25;
      break;
    case 'build':
    case 'ci':
      weight = 1.0;
      break;
    case 'chore':
      weight = 0.8;
      break;
    case 'style':
      weight = 0.6;
      break;
    case 'docs':
      weight = 0.6;
      break;
    default:
      weight = 2.0;
  }

  // 2. High-effort engineering indicators (+1.0 to +1.5)
  if (
    /\b(customdhis2rulesengine|rules engine|modal.*event|event.*modal|export.*stream|totp|multi-factor|two-factor|composite index|pipeline|database migration|schema|architecture)\b/i.test(
      raw
    )
  ) {
    weight += 1.2;
  } else if (
    /\b(integration|integrate|synchronize|sync|calendar|date.*filter|url param|persistence|hook|callback|generator)\b/i.test(
      raw
    )
  ) {
    weight += 0.8;
  }

  // 3. Low-effort / cosmetic indicators (-0.8 to -1.2)
  if (
    /\b(typo|rename|terminology|label|font weight|license|licence|debug log|clean log|d2\.config|readme)\b/i.test(
      raw
    )
  ) {
    weight -= 1.0;
  }

  // 4. Multi-line commit body indicates detailed engineering work (+0.5)
  if (p.body && p.body.length > 50) {
    weight += 0.6;
  }

  return Math.min(5.0, Math.max(0.5, +weight.toFixed(2)));
}

/**
 * Calibrates tasks so that each individual workday (spentDate) targets approximately 8.0 hours.
 * Hours are distributed proportionally to each commit's complexity weight.
 * All hours are rounded to clean quarter-hour increments (0.25, 0.5, 0.75, 1.0, 1.25, 1.5, etc.)
 */
export function calibrateDailyHours(
  tasks: GeminiTaskItem[],
  commits?: GitHubCommit[],
  targetDailyHours: number = 8.0
): GeminiTaskItem[] {
  if (!tasks || tasks.length === 0) return [];

  // Map SHAs to commits if provided
  const commitMap = new Map<string, GitHubCommit>();
  if (commits) {
    for (const c of commits) {
      commitMap.set(c.sha.substring(0, 7), c);
      commitMap.set(c.sha, c);
    }
  }

  // Group tasks by spentDate
  const dayGroups = new Map<string, GeminiTaskItem[]>();
  for (const t of tasks) {
    const day = t.spentDate || 'unknown';
    if (!dayGroups.has(day)) {
      dayGroups.set(day, []);
    }
    dayGroups.get(day)!.push(t);
  }

  const calibratedTasks: GeminiTaskItem[] = [];

  for (const [, group] of dayGroups.entries()) {
    // If only 1 task on this day
    if (group.length === 1) {
      const singleTask = group[0];
      const firstSha = singleTask.sourceCommitShas?.[0];
      const matchingCommit = firstSha ? commitMap.get(firstSha) : undefined;
      const weight = matchingCommit
        ? calculateCommitComplexity(matchingCommit)
        : singleTask.suggestedHours || 2.0;

      // Single commit effort allocation for a full working day
      let allocatedHours = 8.0;
      if (weight <= 1.0) {
        allocatedHours = 3.0; // minor chore/typo on its own day
      } else if (weight <= 2.0) {
        allocatedHours = 5.0; // standard fix
      } else {
        allocatedHours = 8.0; // standard full-day feature/refactor
      }

      calibratedTasks.push({
        ...singleTask,
        suggestedHours: allocatedHours,
      });
      continue;
    }

    // Multiple tasks on the same day: distribute 8.0 hours proportionally by complexity
    const weights: number[] = group.map((task) => {
      const firstSha = task.sourceCommitShas?.[0];
      const matchingCommit = firstSha ? commitMap.get(firstSha) : undefined;
      if (matchingCommit) {
        return calculateCommitComplexity(matchingCommit);
      }
      return task.suggestedHours && task.suggestedHours > 0 ? task.suggestedHours : 2.0;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Calculate proportional raw hours for each task
    const rawHoursList = weights.map((w) => (w / totalWeight) * targetDailyHours);

    // Round to nearest quarter hour (0.25), minimum 0.25h
    const roundedHoursList = rawHoursList.map((raw) => {
      const quarterRounded = Math.round(raw * 4) / 4;
      return Math.max(0.25, quarterRounded);
    });

    // Check discrepancy with targetDailyHours
    let currentSum = roundedHoursList.reduce((acc, h) => acc + h, 0);
    let diff = Math.round((targetDailyHours - currentSum) * 100) / 100;

    // Adjust discrepancy in 0.25 steps to the highest-weight items
    if (diff !== 0 && Math.abs(diff) < 3.0) {
      const sortedIndices = weights
        .map((w, idx) => ({ w, idx }))
        .sort((a, b) => b.w - a.w)
        .map((item) => item.idx);

      let stepIndex = 0;
      const step = diff > 0 ? 0.25 : -0.25;

      while (Math.abs(diff) >= 0.24 && stepIndex < sortedIndices.length * 4) {
        const targetIdx = sortedIndices[stepIndex % sortedIndices.length];
        const newHour = roundedHoursList[targetIdx] + step;

        if (newHour >= 0.25) {
          roundedHoursList[targetIdx] = +(newHour.toFixed(2));
          diff = Math.round((diff - step) * 100) / 100;
        }
        stepIndex++;
      }
    }

    // Assign calibrated hours to tasks
    group.forEach((task, idx) => {
      calibratedTasks.push({
        ...task,
        suggestedHours: +(roundedHoursList[idx].toFixed(2)),
      });
    });
  }

  return calibratedTasks;
}

/**
 * Transforms a single GitHub commit into an individual Harvest timesheet task.
 * (1 commit = 1 task)
 */
export function analyzeCommitToTask(
  commit: GitHubCommit,
  lang: 'en' | 'pt' = 'en',
  idx: number = 0
): GeminiTaskItem {
  const parsed = parseCommit(commit);
  const businessTitle = generateExecutiveTitle(parsed, lang);
  const businessDescription = generateElevatedDescription([commit], lang);
  const complexityWeight = calculateCommitComplexity(commit, parsed);

  // Exact commit date in YYYY-MM-DD
  const spentDate =
    commit.commit?.author?.date?.substring(0, 10) ||
    new Date().toISOString().substring(0, 10);

  // Initial estimate proportional to complexity (will be calibrated by calibrateDailyHours)
  const initialHours = Math.max(0.5, Math.min(4.0, Math.round(complexityWeight * 0.75 * 4) / 4));

  return {
    id: `task-ai-${Date.now()}-${idx + 1}`,
    businessTitle,
    businessDescription,
    suggestedHours: initialHours,
    spentDate,
    sourceCommitShas: [commit.sha.substring(0, 7)],
  };
}

/**
 * Transforms an array of selected commits into individual Harvest timesheet tasks (1 commit = 1 task).
 * Each task accurately takes that commit's individual date, concise 1-2 line description,
 * and calibrated hours targeting ~8.0h per workday.
 */
export function analyzeCommitsToTasks(
  commits: GitHubCommit[],
  lang: 'en' | 'pt' = 'en'
): GeminiTaskItem[] {
  if (!commits || commits.length === 0) {
    return [];
  }
  const rawTasks = commits.map((c, idx) => analyzeCommitToTask(c, lang, idx));
  return calibrateDailyHours(rawTasks, commits);
}

// Backward-compatibility alias
export const analyzeCommitsToTask = analyzeCommitToTask;
