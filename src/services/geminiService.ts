import { GeminiTaskItem, GitHubCommit } from '../types';

/**
 * Free AI providers, tried in this order until one answers:
 *   1. Google Gemini (Free Tier Flash models)   - key from aistudio.google.com
 *   2. Groq (free tier, open models)             - key from console.groq.com
 *   3. OpenRouter (":free" models)               - key from openrouter.ai
 * Only providers with a configured key are used.
 */

// Gemini Free Tier text models, best first. The "-latest" aliases are kept
// up to date by Google, so they survive model retirements.
const GEMINI_FREE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

// Groq model ids change often, so the list is discovered at runtime and ranked by these patterns.
const GROQ_MODEL_PREFERENCE = [/gpt-oss-120b/i, /llama-3\.3-70b/i, /llama-4/i, /qwen/i, /gpt-oss/i, /llama/i];
const GROQ_FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];

// "openrouter/free" auto-routes to whichever free model is available.
const OPENROUTER_FREE_MODELS = ['openrouter/free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-lightning:free'];

// Abort a slow model and fall through to the next one (gemini-flash-latest can take minutes).
const REQUEST_TIMEOUT_MS = 45000;

// Statuses that mean "try the next model": retired model, quota, bad request, server error, timeout.
const RETRYABLE_STATUS = [400, 401, 403, 404, 413, 422, 429, 500, 502, 503, 504];

// Flash variants that cannot produce plain text replies.
const NON_TEXT_MODEL = /(tts|image|audio|live|embedding|omni|whisper|guard)/i;

export interface AiProviderKeys {
  groqApiKey?: string;
  openRouterApiKey?: string;
}

type Schema = { type: string; properties?: Record<string, Schema>; items?: Schema; required?: string[] };

class AiCallError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export class GeminiService {
  private apiKey: string;
  private groqApiKey: string;
  private openRouterApiKey: string;
  private cachedModel: string | null = null;
  private groqModels: string[] | null = null;

  /** "provider/model" that produced the last successful answer, for logging. */
  lastModelUsed = '';

  constructor(apiKey: string, keys: AiProviderKeys = {}) {
    this.apiKey = (apiKey || '').trim();
    this.groqApiKey = (keys.groqApiKey || '').trim();
    this.openRouterApiKey = (keys.openRouterApiKey || '').trim();
  }

  get hasAnyKey(): boolean {
    return !!(this.apiKey || this.groqApiKey || this.openRouterApiKey);
  }

  /**
   * Query ListModels and pick the best Free Tier Flash model this key can use.
   */
  async getBestAvailableModel(): Promise<string> {
    if (this.cachedModel) return this.cachedModel;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        const availableModels: string[] = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => (m.name || '').replace(/^models\//, ''))
          .filter(Boolean);

        const pick =
          GEMINI_FREE_MODELS.find((m) => availableModels.includes(m)) ||
          availableModels.find(
            (m) => /flash/i.test(m) && !/pro|preview/i.test(m) && !NON_TEXT_MODEL.test(m)
          );

        if (pick) {
          this.cachedModel = pick;
          return pick;
        }
      }
    } catch (err) {
      console.warn('Could not list Gemini models:', err);
    }

    this.cachedModel = GEMINI_FREE_MODELS[0];
    return this.cachedModel;
  }

  async testConnection(): Promise<{ success: boolean; modelName?: string; error?: string }> {
    try {
      if (!this.hasAnyKey) {
        return { success: false, error: 'Nenhuma chave de IA fornecida (Gemini, Groq ou OpenRouter)' };
      }
      const providers: string[] = [];
      if (this.apiKey) providers.push(`gemini/${await this.getBestAvailableModel()}`);
      if (this.groqApiKey) providers.push('groq');
      if (this.openRouterApiKey) providers.push('openrouter');
      return { success: true, modelName: providers.join(' → ') };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede ao conectar à API de IA' };
    }
  }

  async transformCommitsToTasks(
    commits: GitHubCommit[],
    repoName?: string,
    language: 'en' | 'pt' = 'en'
  ): Promise<GeminiTaskItem[]> {
    if (!commits || commits.length === 0) {
      return [];
    }

    if (!this.hasAnyKey) {
      throw new Error('Chave de IA ausente. Configure Gemini, Groq ou OpenRouter nas Definições.');
    }

    const commitsData = commits.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message,
      date: c.commit.author.date.substring(0, 10),
      author: c.commit.author.name,
      ...(c.changeSummary ? { codeChanges: c.changeSummary } : {}),
    }));

    const isEnglish = language === 'en';

    const systemPrompt = isEnglish
      ? `You are a Principal Technical Lead and Senior Project Manager creating formal Harvest timesheet entries.
Your task is to convert EACH software commit into its OWN individual Harvest timesheet task (1-to-1 mapping: 1 commit = 1 task).
Write exclusively in professional, corporate ENGLISH suitable for client timesheet reports.

Each commit has a 'message' and, when available, 'codeChanges': the files touched, lines added/removed and an excerpt of the diff.
READ THE CODE CHANGES CAREFULLY: they are the main source of truth about what was actually done. The commit message is often short or vague.

Mandatory transformation rules:
1. 1 COMMIT = 1 TASK. For every commit provided in the input, output exactly one corresponding task object. Do NOT merge different commits together.
2. 'businessTitle': A concise, corporate title focused on the feature or deliverable (e.g. "Event Details Modal & Interactive Row-Click Integration").
3. 'businessDescription': A COMPLETE description of the work, 2 to 4 sentences (approx 250-600 characters):
   - what was implemented, fixed or refactored, based on the code changes;
   - which screens, forms, tables, rules or modules were affected (name them in functional terms);
   - the practical benefit for users or for the system.
   Write for a client: no file paths, no function/variable names, no SHAs, no code. Describe only what the changes show; never invent features.
   For merge commits, describe the work the merge brings in.
4. 'spentDate': Must strictly match the commit's exact author date (YYYY-MM-DD).
5. 'sourceCommitShas': Array with exactly this commit's 7-character SHA.
6. 'suggestedHours': Realistic hour estimate based on the real size of the change (files changed, lines added/removed) and its complexity. Commits on the same date must be calibrated so their daily sum reaches approximately 8.0 hours. Complex features/architecture take 2.0 to 4.0h, moderate fixes/integrations 1.0 to 2.0h, minor chores/styling/renaming 0.25 to 0.75h. Must be multiples of 0.25.
7. Return only the strict JSON requested.`
      : `Você é um Principal Technical Lead e Gestor de Projetos sénior a gerar notas de timesheet para o Harvest.
A sua tarefa é converter CADA commit de software na sua PRÓPRIA tarefa individual para o Harvest (relação 1 para 1: 1 commit = 1 tarefa).
Escreva exclusivamente em PORTUGUÊS formal e profissional adequado para relatórios de clientes.

Cada commit tem uma 'message' e, quando disponível, 'codeChanges': os ficheiros alterados, linhas adicionadas/removidas e um excerto do diff.
LEIA COM ATENÇÃO AS ALTERAÇÕES DE CÓDIGO: são a principal fonte sobre o que foi realmente feito. A mensagem do commit é muitas vezes curta ou vaga.

Regras obrigatórias de transformação:
1. 1 COMMIT = 1 TAREFA. Para cada commit fornecido, gere exatamente um objeto de tarefa. NÃO junte commits diferentes.
2. 'businessTitle': Título conciso e corporativo focado na funcionalidade ou entrega.
3. 'businessDescription': Uma descrição COMPLETA do trabalho, 2 a 4 frases (cerca de 250 a 600 caracteres):
   - o que foi implementado, corrigido ou reestruturado, com base nas alterações de código;
   - que ecrãs, formulários, tabelas, regras ou módulos foram afetados (em termos funcionais);
   - o benefício prático para os utilizadores ou para o sistema.
   Escreva para um cliente: sem caminhos de ficheiros, sem nomes de funções/variáveis, sem SHAs, sem código. Descreva apenas o que as alterações mostram; nunca invente funcionalidades.
   Para commits de merge, descreva o trabalho que o merge integra.
4. 'spentDate': Deve corresponder estritamente à data exata do commit (formato YYYY-MM-DD).
5. 'sourceCommitShas': Array contendo apenas o SHA de 7 caracteres deste commit.
6. 'suggestedHours': Estimativa realista de horas com base no tamanho real da alteração (ficheiros alterados, linhas adicionadas/removidas) e na complexidade. Os commits na mesma data devem somar aproximadamente 8.0 horas. Funcionalidades complexas/arquitetura 2.0 a 4.0h, correções/integrações médias 1.0 a 2.0h, ajustes menores/estilo/renomeações 0.25 a 0.75h. Deve ser múltiplo de 0.25.
7. Retorne apenas o JSON estrito solicitado.`;

    const userPrompt = isEnglish
      ? `Generate one timesheet task for each of the following ${commits.length} commits from repository ${repoName || 'the project'}:

${JSON.stringify(commitsData, null, 2)}`
      : `Gere uma tarefa de timesheet para cada um dos seguintes ${commits.length} commits do repositório ${repoName || 'do projeto'}:

${JSON.stringify(commitsData, null, 2)}`;

    const schema: Schema = {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          businessTitle: { type: 'STRING' },
          businessDescription: { type: 'STRING' },
          suggestedHours: { type: 'NUMBER' },
          spentDate: { type: 'STRING' },
          sourceCommitShas: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['id', 'businessTitle', 'businessDescription', 'suggestedHours', 'spentDate', 'sourceCommitShas'],
      },
    };

    const parsedTasks = await this.generateJson<GeminiTaskItem[]>(systemPrompt, userPrompt, schema);
    if (!Array.isArray(parsedTasks)) {
      throw new Error('A IA não devolveu uma lista de tarefas.');
    }

    return parsedTasks.map((t, idx) => ({
      id: t.id || `task-${Date.now()}-${idx + 1}`,
      businessTitle: t.businessTitle || 'Tarefa de Desenvolvimento',
      businessDescription: t.businessDescription || '',
      suggestedHours: Math.max(0.25, Number(t.suggestedHours) || 1.0),
      spentDate: t.spentDate || new Date().toISOString().substring(0, 10),
      sourceCommitShas: Array.isArray(t.sourceCommitShas) ? t.sourceCommitShas : [],
    }));
  }

  async translateTasks(
    tasks: { id: string; businessTitle: string; businessDescription: string }[],
    targetLanguage: 'en' | 'pt' = 'en'
  ): Promise<{ id: string; businessTitle: string; businessDescription: string }[]> {
    if (!tasks || tasks.length === 0) return [];
    if (!this.hasAnyKey) {
      throw new Error('Chave de IA ausente. Configure Gemini, Groq ou OpenRouter nas Definições.');
    }

    const langName = targetLanguage === 'en' ? 'ENGLISH' : 'PORTUGUESE';
    const systemPrompt = `You are an expert bilingual corporate technical translator.
Translate the business title and business description of each software development timesheet task into professional, executive-level ${langName}.
Keep the full meaning and length of the description; do not summarize.
Preserve the exact 'id' for each item.
Return only the strict JSON requested.`;

    const userPrompt = `Translate the following ${tasks.length} tasks into executive-level ${langName}:\n\n${JSON.stringify(
      tasks.map((t) => ({ id: t.id, businessTitle: t.businessTitle, businessDescription: t.businessDescription })),
      null,
      2
    )}`;

    const schema: Schema = {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          businessTitle: { type: 'STRING' },
          businessDescription: { type: 'STRING' },
        },
        required: ['id', 'businessTitle', 'businessDescription'],
      },
    };

    const result = await this.generateJson<{ id: string; businessTitle: string; businessDescription: string }[]>(
      systemPrompt,
      userPrompt,
      schema
    );
    return Array.isArray(result) ? result : [];
  }

  async translateTask(
    task: { id: string; businessTitle: string; businessDescription: string },
    targetLanguage: 'en' | 'pt' = 'en'
  ): Promise<{ businessTitle: string; businessDescription: string }> {
    const results = await this.translateTasks([task], targetLanguage);
    if (results.length > 0) {
      return {
        businessTitle: results[0].businessTitle,
        businessDescription: results[0].businessDescription,
      };
    }
    throw new Error('Falha ao traduzir tarefa.');
  }

  /**
   * @param commitDetails one entry per commit: the message, followed by its code changes when available.
   */
  async improveTaskDescription(
    taskTitle: string,
    currentDescription: string,
    commitDetails: string[],
    language: 'en' | 'pt' = 'en'
  ): Promise<{ businessTitle: string; businessDescription: string }> {
    if (!this.hasAnyKey) {
      throw new Error('Chave de IA ausente.');
    }

    const isEnglish = language === 'en';
    const systemPrompt = isEnglish
      ? `You are an elite Principal Technical Product Lead and executive writer.
Your job is to read Git commits (message AND code changes) and write a complete, executive-level timesheet title and description in corporate ENGLISH.
CRITICAL MANDATORY RULES:
1. Read the code changes carefully: they show what was really done. The commit message may be short or vague.
2. 'businessTitle': A concise, corporate title focused on the feature or deliverable.
3. 'businessDescription': A COMPLETE description, 2 to 4 sentences (approx 250-600 characters): what was implemented or fixed, which screens/forms/rules/modules were affected (in functional terms) and the practical benefit. No file paths, no function names, no code. Never invent features the changes do not show.
4. FORBIDDEN: generic boilerplate such as "Completed core implementation and functional adjustments based on commits".
5. Return strictly a JSON object with 'businessTitle' and 'businessDescription'.`
      : `Você é um Principal Technical Product Lead e redator executivo de topo.
O seu trabalho é ler commits do Git (mensagem E alterações de código) e escrever um título e uma descrição completos e executivos para o Harvest em PORTUGUÊS formal.
REGRAS CRÍTICAS OBRIGATÓRIAS:
1. Leia com atenção as alterações de código: mostram o que foi realmente feito. A mensagem do commit pode ser curta ou vaga.
2. 'businessTitle': Título conciso e corporativo focado na funcionalidade ou entrega.
3. 'businessDescription': Uma descrição COMPLETA, 2 a 4 frases (cerca de 250 a 600 caracteres): o que foi implementado ou corrigido, que ecrãs/formulários/regras/módulos foram afetados (em termos funcionais) e o benefício prático. Sem caminhos de ficheiros, sem nomes de funções, sem código. Nunca invente funcionalidades que as alterações não mostram.
4. PROIBIDO: frases genéricas como "Implementação e validação de requisitos técnicos para X commits".
5. Retorne estritamente um objeto JSON com 'businessTitle' e 'businessDescription'.`;

    const userPrompt = `Current Title: ${taskTitle}
Current Description: ${currentDescription}

Original Git Commits:
${commitDetails.length > 0 ? commitDetails.map((m, i) => `Commit ${i + 1}:\n${m}`).join('\n---\n') : '(No commit details, elevate current title/description)'}

Write the improved title and complete description in ${isEnglish ? 'English' : 'Portuguese'} as JSON.`;

    const schema: Schema = {
      type: 'OBJECT',
      properties: {
        businessTitle: { type: 'STRING' },
        businessDescription: { type: 'STRING' },
      },
      required: ['businessTitle', 'businessDescription'],
    };

    const parsed = await this.generateJson<{ businessTitle?: string; businessDescription?: string }>(
      systemPrompt,
      userPrompt,
      schema
    );
    return {
      businessTitle: parsed?.businessTitle || taskTitle,
      businessDescription: parsed?.businessDescription || currentDescription,
    };
  }

  // ---------------------------------------------------------------------------
  // Provider chain
  // ---------------------------------------------------------------------------

  /** Ask each configured free provider in turn and return the first valid JSON answer. */
  private async generateJson<T>(systemPrompt: string, userPrompt: string, schema: Schema): Promise<T> {
    const errors: string[] = [];

    if (this.apiKey) {
      try {
        return await this.generateWithGemini<T>(systemPrompt, userPrompt, schema);
      } catch (err: any) {
        errors.push(`Gemini: ${err.message}`);
        console.warn('Gemini failed, trying next free provider:', err.message);
      }
    }

    if (this.groqApiKey) {
      try {
        const models = await this.getGroqModels();
        return await this.generateWithOpenAiCompatible<T>(
          'groq',
          'https://api.groq.com/openai/v1/chat/completions',
          this.groqApiKey,
          models,
          systemPrompt,
          userPrompt,
          schema,
          true
        );
      } catch (err: any) {
        errors.push(`Groq: ${err.message}`);
        console.warn('Groq failed, trying next free provider:', err.message);
      }
    }

    if (this.openRouterApiKey) {
      try {
        return await this.generateWithOpenAiCompatible<T>(
          'openrouter',
          'https://openrouter.ai/api/v1/chat/completions',
          this.openRouterApiKey,
          OPENROUTER_FREE_MODELS,
          systemPrompt,
          userPrompt,
          schema,
          false
        );
      } catch (err: any) {
        errors.push(`OpenRouter: ${err.message}`);
        console.warn('OpenRouter failed:', err.message);
      }
    }

    if (errors.length === 0) {
      throw new Error('Chave de IA ausente. Configure Gemini, Groq ou OpenRouter nas Definições.');
    }
    throw new Error(`Todas as IAs gratuitas falharam. ${errors.join(' | ')}`);
  }

  private async generateWithGemini<T>(systemPrompt: string, userPrompt: string, schema: Schema): Promise<T> {
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    };

    const primary = await this.getBestAvailableModel();
    const candidates = [primary, ...GEMINI_FREE_MODELS.filter((m) => m !== primary)];
    let lastError = '';

    for (const model of candidates) {
      try {
        const response = await this.fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        if (!response.ok) {
          throw new AiCallError(await this.readError(response), response.status);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new AiCallError('resposta vazia');

        const parsed = this.parseJson<T>(text, schema);
        this.cachedModel = model;
        this.lastModelUsed = `gemini/${model}`;
        return parsed;
      } catch (err: any) {
        lastError = `${model}: ${err.message}`;
        if (err instanceof AiCallError && err.status && !RETRYABLE_STATUS.includes(err.status)) break;
        console.warn(`Gemini model ${model} failed (${err.message}), trying next...`);
      }
    }
    throw new Error(lastError || 'sem modelos disponíveis');
  }

  /** Groq and OpenRouter both speak the OpenAI chat-completions protocol. */
  private async generateWithOpenAiCompatible<T>(
    provider: string,
    url: string,
    apiKey: string,
    models: string[],
    systemPrompt: string,
    userPrompt: string,
    schema: Schema,
    useJsonMode: boolean
  ): Promise<T> {
    // JSON mode requires a top-level object, so arrays are wrapped in {"items": [...]}.
    const wrapped = schema.type === 'ARRAY';
    const jsonSchema = wrapped ? { type: 'object', properties: { items: toJsonSchema(schema) }, required: ['items'] } : toJsonSchema(schema);
    const fullSystem = `${systemPrompt}

Respond with ONLY a valid JSON object (no markdown, no commentary) that matches this JSON Schema:
${JSON.stringify(jsonSchema)}`;

    let lastError = '';
    for (const model of models) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...(provider === 'openrouter' ? { 'X-Title': 'Commit2Harvest' } : {}),
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [
              { role: 'system', content: fullSystem },
              { role: 'user', content: userPrompt },
            ],
            ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
        });
        if (!response.ok) {
          throw new AiCallError(await this.readError(response), response.status);
        }
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new AiCallError(data.error?.message || 'resposta vazia');

        let parsed: any = this.parseJson<any>(text, wrapped ? { type: 'OBJECT' } : schema);
        if (wrapped) {
          parsed = Array.isArray(parsed) ? parsed : parsed?.items ?? Object.values(parsed || {}).find(Array.isArray);
          if (!Array.isArray(parsed)) throw new AiCallError('JSON sem lista "items"');
        }
        this.lastModelUsed = `${provider}/${data.model || model}`;
        return parsed as T;
      } catch (err: any) {
        lastError = `${model}: ${err.message}`;
        if (err instanceof AiCallError && err.status === 401) break; // bad key: other models won't help
        console.warn(`${provider} model ${model} failed (${err.message}), trying next...`);
      }
    }
    throw new Error(lastError || 'sem modelos disponíveis');
  }

  private async getGroqModels(): Promise<string[]> {
    if (this.groqModels) return this.groqModels;
    try {
      const response = await this.fetchWithTimeout('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this.groqApiKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        const ids: string[] = (data.data || [])
          .filter((m: any) => m.active !== false)
          .map((m: any) => m.id as string)
          .filter((id: string) => !NON_TEXT_MODEL.test(id));
        const ranked: string[] = [];
        for (const pattern of GROQ_MODEL_PREFERENCE) {
          for (const id of ids) if (pattern.test(id) && !ranked.includes(id)) ranked.push(id);
        }
        if (ranked.length > 0) {
          this.groqModels = ranked.slice(0, 4);
          return this.groqModels;
        }
      }
    } catch (err) {
      console.warn('Could not list Groq models:', err);
    }
    this.groqModels = GROQ_FALLBACK_MODELS;
    return this.groqModels;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new AiCallError(`timeout após ${REQUEST_TIMEOUT_MS / 1000}s`, 504);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async readError(response: Response): Promise<string> {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return `HTTP ${response.status}: ${parsed.error?.message || parsed.message || text.slice(0, 200)}`;
    } catch {
      return `HTTP ${response.status}: ${text.slice(0, 200)}`;
    }
  }

  /** Parse model output, tolerating ```json fences or text around the JSON. */
  private parseJson<T>(text: string, schema: Schema): T {
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const open = schema.type === 'ARRAY' ? '[' : '{';
      const close = schema.type === 'ARRAY' ? ']' : '}';
      const start = cleaned.indexOf(open);
      const end = cleaned.lastIndexOf(close);
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          // fall through
        }
      }
      throw new AiCallError('a IA devolveu JSON inválido');
    }
  }
}

/** Convert a Gemini-style schema (uppercase types) into standard JSON Schema. */
function toJsonSchema(schema: Schema): any {
  const out: any = { type: schema.type.toLowerCase() };
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)])
    );
  }
  if (schema.items) out.items = toJsonSchema(schema.items);
  if (schema.required) out.required = schema.required;
  return out;
}
