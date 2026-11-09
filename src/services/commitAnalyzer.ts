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
      if (/config/i.test(match)) return 'configuration settings';
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses a GitHub commit into structured metadata
 */
export function parseCommit(commit: GitHubCommit): ParsedCommit {
  const fullMsg = commit.commit.message || '';
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

  return {
    sha: commit.sha,
    shortSha: commit.sha.substring(0, 7),
    type,
    scope,
    subject: splitCamelCase(subject),
    body,
    rawMessage: fullMsg,
    date: commit.commit.author.date.substring(0, 10),
    author: commit.commit.author.name,
  };
}

/**
 * Translates and elevates a parsed commit subject into an executive title
 */
export function generateExecutiveTitle(parsed: ParsedCommit, lang: 'en' | 'pt'): string {
  const isEn = lang === 'en';
  let subject = parsed.subject;

  // Clean common prefixes
  subject = subject
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
      if (idx > 0 && ['and', 'with', 'for', 'to', 'in', 'of', 'on', 'via', 'by', 'e', 'de', 'do', 'da', 'para', 'com'].includes(lower)) {
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
    .replace(/\bEvent Details Modal\b/gi, 'Janela Modal de Detalhes do Evento')
    .replace(/\bRow[- ]Click Integration\b/gi, 'Integração por Clique na Linha')
    .replace(/\bReactivate Event Hook\b/gi, 'Reativação de Sincronização de Eventos')
    .replace(/\bCustom DHIS2 Rules Engine\b/gi, 'Motor Dinâmico de Regras DHIS2')
    .replace(/\bDate Filter(ing)?\b/gi, 'Filtragem por Intervalo de Datas')
    .replace(/\bDate Range\b/gi, 'Intervalo Temporal')
    .replace(/\bDatePicker\b/gi, 'Seletor de Datas')
    .replace(/\bEnrollment Content Filters\b/gi, 'Filtros de Inscrição')
    .replace(/\bExclude DATE Type Columns\b/gi, 'Exclusão de Colunas do Tipo Data')
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
 * Intelligent semantic analyzer: elevates raw commit messages into
 * a context-rich, executive non-technical description detailing business value.
 */
export function generateElevatedDescription(
  commits: GitHubCommit[],
  lang: 'en' | 'pt' = 'en'
): string {
  if (!commits || commits.length === 0) {
    return lang === 'en'
      ? 'Delivered planned software enhancements and operational maintenance tasks.'
      : 'Entrega de melhorias funcionais planeadas e manutenção operacional do sistema.';
  }

  const isEn = lang === 'en';
  const parsedList = commits.map(parseCommit);

  // Group by distinct changes
  const features: string[] = [];
  const fixes: string[] = [];
  const refactors: string[] = [];
  const chores: string[] = [];

  for (const item of parsedList) {
    const raw = item.subject.toLowerCase();

    // Check specific known modules / capabilities for rich contextual enhancement
    if (/event details modal/i.test(raw) || (/modal/i.test(raw) && /event/i.test(raw))) {
      features.push(
        isEn
          ? 'implemented an interactive event details modal allowing users to inspect complete record details upon selecting a row in the data table'
          : 'implementação da janela modal de detalhes do evento, permitindo aos utilizadores inspecionar registos completos diretamente ao selecionar uma linha na tabela'
      );
    }
    if (/reactivate event hook|hook with row click/i.test(raw)) {
      features.push(
        isEn
          ? 'reactivated real-time event synchronization hooks with table row-click integration to ensure immediate data inspection without page reloads'
          : 'reativação dos mecanismos de sincronização em tempo real com suporte a clique na linha, assegurando acesso instantâneo aos dados sem recarregar a página'
      );
    }
    if (/customdhis2rulesengine|rules engine/i.test(raw)) {
      if (/onassign/i.test(raw)) {
        refactors.push(
          isEn
            ? 'enhanced the DHIS2 business rules engine with automated assignment callback support to maintain business logic consistency'
            : 'otimização do motor de regras DHIS2 com suporte a callbacks automáticos de atribuição para assegurar a consistência das regras de negócio'
        );
      } else {
        refactors.push(
          isEn
            ? 'integrated the DHIS2 dynamic business rules engine into the event modal workflow'
            : 'integração do motor de regras dinâmicas DHIS2 no fluxo da modal de eventos'
        );
      }
    }
    if (/exclude date type|date.*content filter/i.test(raw)) {
      fixes.push(
        isEn
          ? 'resolved filtering discrepancies within enrollment views by properly excluding date-type columns from text search criteria'
          : 'resolução de inconsistências nos filtros de inscrição através do tratamento adequado de colunas do tipo data em pesquisas textuais'
      );
    }
    if (/date filter|datepicker|school calendar|persistent date/i.test(raw)) {
      features.push(
        isEn
          ? 'introduced persistent calendar date range filtering with URL parameter state retention for continuous navigation'
          : 'introdução de filtragem avançada por intervalo de datas no calendário com persistência de estado nos parâmetros do URL'
      );
    }
    if (/status filtering|status.*records|status key/i.test(raw)) {
      features.push(
        isEn
          ? 'added status filtering controls and visual indicators for event records to streamline operational triage'
          : 'adicionados controlos de filtragem por estado e indicadores visuais para facilitar a triagem de registos'
      );
    }
    if (/absence|attendance/i.test(raw)) {
      fixes.push(
        isEn
          ? 'corrected student absence calculation logic based on status keys to ensure reliable attendance reporting'
          : 'correção da lógica de apuramento de assiduidade e faltas de estudantes com base nas chaves de estado'
      );
    }
    if (/profile from.*metadata|program metadata/i.test(raw)) {
      features.push(
        isEn
          ? 'configured automated profile generation from program metadata to streamline student record enrollment'
          : 'configurada a geração automática de perfis a partir dos metadados do programa para agilizar as inscrições'
      );
    }
    if (/i18n|internationaliz/i.test(raw)) {
      features.push(
        isEn
          ? 'implemented full internationalization support by replacing hardcoded UI labels with localized translation keys'
          : 'implementado suporte a internacionalização com substituição de textos fixos por chaves de tradução multilíngue'
      );
    }
    if (/image upload|avatar/i.test(raw)) {
      features.push(
        isEn
          ? 'added profile image upload capabilities with enhanced avatar display across student summaries'
          : 'implementado carregamento de fotografias de perfil e melhoria na apresentação visual dos avatares'
      );
    }
    if (/excel export|streaming export/i.test(raw)) {
      features.push(
        isEn
          ? 'implemented bulk Excel streaming export handlers to enable fast report downloads without memory constraints'
          : 'implementada exportação em lote para Excel com processamento em fluxo contínuo para evitar sobrecarga de memória'
      );
    }
    if (/licence|license|bsd/i.test(raw)) {
      chores.push(
        isEn
          ? 'formalized repository compliance with BSD 3-Clause licensing and author governance'
          : 'formalização da conformidade do repositório com licenciamento BSD 3-Clause e governança de autoria'
      );
    }
    if (/remove debug|clean.*log/i.test(raw)) {
      chores.push(
        isEn
          ? 'removed development debug logs to prepare production-ready stability'
          : 'limpeza de registos de depuração (debug logs) para garantir estabilidade em ambiente produtivo'
      );
    }

    // Generic fallback extraction if no specific pattern matched
    if (
      features.length === 0 &&
      fixes.length === 0 &&
      refactors.length === 0 &&
      chores.length === 0
    ) {
      const cleanSubject = item.subject
        .replace(/^(feat|fix|refactor|perf|chore|style|docs|test):\s*/i, '')
        .trim();

      if (item.type === 'fix') {
        fixes.push(
          isEn
            ? `resolved issues regarding ${cleanSubject}, ensuring platform stability and accurate data processing`
            : `resolução de anomalia relativa a ${cleanSubject}, assegurando a estabilidade e integridade dos dados`
        );
      } else if (item.type === 'refactor') {
        refactors.push(
          isEn
            ? `refactored and streamlined ${cleanSubject} to improve code maintainability and user workflow responsiveness`
            : `refatoração e otimização de ${cleanSubject} para aumentar a manutenibilidade e a resposta dos fluxos`
        );
      } else if (item.type === 'perf') {
        refactors.push(
          isEn
            ? `optimized system performance and latency for ${cleanSubject}`
            : `otimização de desempenho e tempo de resposta para ${cleanSubject}`
        );
      } else {
        features.push(
          isEn
            ? `implemented ${cleanSubject}, delivering user-facing functionality and enhancing system usability`
            : `implementação de ${cleanSubject}, entregando novas funcionalidades aos utilizadores e melhorando a usabilidade`
        );
      }
    }
  }

  // Deduplicate entries
  const uniqueFeatures = Array.from(new Set(features));
  const uniqueFixes = Array.from(new Set(fixes));
  const uniqueRefactors = Array.from(new Set(refactors));
  const uniqueChores = Array.from(new Set(chores));

  // Synthesize into fluent executive sentences
  const sentences: string[] = [];

  if (isEn) {
    if (uniqueFeatures.length > 0) {
      const featText = uniqueFeatures.join(', and ');
      sentences.push(
        featText.charAt(0).toUpperCase() + featText.slice(1) + '.'
      );
    }
    if (uniqueFixes.length > 0) {
      const fixText = uniqueFixes.join('; additionally, ');
      sentences.push(
        fixText.charAt(0).toUpperCase() + fixText.slice(1) + '.'
      );
    }
    if (uniqueRefactors.length > 0) {
      const refText = uniqueRefactors.join('. Furthermore, ');
      sentences.push(
        refText.charAt(0).toUpperCase() + refText.slice(1) + '.'
      );
    }
    if (uniqueChores.length > 0 && sentences.length < 2) {
      const choreText = uniqueChores.join(', along with ');
      sentences.push(
        choreText.charAt(0).toUpperCase() + choreText.slice(1) + '.'
      );
    }

    // Outcome and business impact statement
    if (uniqueFeatures.length > 0 && uniqueFixes.length > 0) {
      sentences.push(
        'These updates streamline day-to-day user operations while eliminating data entry bottlenecks.'
      );
    } else if (uniqueFeatures.length > 0) {
      sentences.push(
        'Provides end-users with immediate visual access to granular records, significantly improving data navigation.'
      );
    } else if (uniqueFixes.length > 0) {
      sentences.push(
        'Eliminates operational errors and ensures accurate information rendering across user dashboards.'
      );
    } else {
      sentences.push(
        'Enhances overall platform reliability and user operational experience.'
      );
    }
  } else {
    // Portuguese Synthesis
    if (uniqueFeatures.length > 0) {
      const featText = uniqueFeatures.join(', e ');
      sentences.push(
        featText.charAt(0).toUpperCase() + featText.slice(1) + '.'
      );
    }
    if (uniqueFixes.length > 0) {
      const fixText = uniqueFixes.join('; adicionalmente, ');
      sentences.push(
        fixText.charAt(0).toUpperCase() + fixText.slice(1) + '.'
      );
    }
    if (uniqueRefactors.length > 0) {
      const refText = uniqueRefactors.join('. Adicionalmente, ');
      sentences.push(
        refText.charAt(0).toUpperCase() + refText.slice(1) + '.'
      );
    }
    if (uniqueChores.length > 0 && sentences.length < 2) {
      const choreText = uniqueChores.join(', juntamente com ');
      sentences.push(
        choreText.charAt(0).toUpperCase() + choreText.slice(1) + '.'
      );
    }

    if (uniqueFeatures.length > 0 && uniqueFixes.length > 0) {
      sentences.push(
        'Estas atualizações agilizam os fluxos de trabalho operacionais e eliminam constrangimentos no acesso à informação.'
      );
    } else if (uniqueFeatures.length > 0) {
      sentences.push(
        'Proporciona aos utilizadores acesso visual imediato a registos detalhados, melhorando significativamente a navegação.'
      );
    } else if (uniqueFixes.length > 0) {
      sentences.push(
        'Elimina falhas operacionais e assegura a consistência dos dados apresentados nos painéis de controlo.'
      );
    } else {
      sentences.push(
        'Reforça a estabilidade global da plataforma e a fiabilidade das operações.'
      );
    }
  }

  return sentences.join(' ');
}

/**
 * Main analyzer function: transforms a set of selected commits into a cohesive
 * executive GeminiTaskItem ready for Harvest timesheet entry.
 */
export function analyzeCommitsToTask(
  commits: GitHubCommit[],
  lang: 'en' | 'pt' = 'en',
  spentDateFallback?: string
): GeminiTaskItem {
  if (!commits || commits.length === 0) {
    const isEn = lang === 'en';
    return {
      id: `task-local-${Date.now()}`,
      businessTitle: isEn
        ? 'Platform Engineering & Workflow Optimizations'
        : 'Desenvolvimento e Manutenção Evolutiva da Plataforma',
      businessDescription: isEn
        ? 'Delivered planned software enhancements and operational maintenance tasks.'
        : 'Entrega de melhorias funcionais planeadas e manutenção operacional do sistema.',
      suggestedHours: 1.0,
      spentDate: spentDateFallback || new Date().toISOString().substring(0, 10),
      sourceCommitShas: [],
    };
  }

  const parsedCommits = commits.map(parseCommit);
  const primaryCommit = parsedCommits[0];

  // Generate executive title
  const businessTitle = generateExecutiveTitle(primaryCommit, lang);

  // Generate contextual, elevated non-technical description
  const businessDescription = generateElevatedDescription(commits, lang);

  // Calculate suggested hours realistically based on commit volume & complexity
  const baseHours = commits.length * 0.75;
  const suggestedHours = Math.min(8.0, Math.max(0.5, +baseHours.toFixed(2)));

  // Use predominant commit date or provided fallback
  const spentDate = primaryCommit.date || spentDateFallback || new Date().toISOString().substring(0, 10);
  const sourceCommitShas = commits.map((c) => c.sha.substring(0, 7));

  return {
    id: `task-ai-${Date.now()}`,
    businessTitle,
    businessDescription,
    suggestedHours,
    spentDate,
    sourceCommitShas,
  };
}
