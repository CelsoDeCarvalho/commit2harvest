import { GeminiTaskItem, GitHubCommit } from '../types';

export class GeminiService {
  private apiKey: string;
  private cachedModel: string | null = null;
  private defaultModel = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  /**
   * Dynamically query Google's ModelService.ListModels to discover
   * the exact models currently active and supported by this API key.
   * Explicitly prioritizes Free Tier FLASH models (avoiding Pro models with limit: 0).
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

        // Flash models prioritized for Free Tier accounts (0 RPM on Pro models)
        const flashPriorities = [
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-2.0-flash-lite',
          'gemini-2.0-flash-lite-preview-02-05',
          'gemini-1.5-flash-8b',
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash-latest',
        ];

        // 1. Look for known Flash models
        for (const preferred of flashPriorities) {
          const match = availableModels.find((m) => m === preferred || m.startsWith(preferred));
          if (match) {
            this.cachedModel = match;
            return match;
          }
        }

        // 2. Look for any non-pro model containing "flash"
        const anyFlash = availableModels.find(
          (m) => m.toLowerCase().includes('flash') && !m.toLowerCase().includes('pro')
        );
        if (anyFlash) {
          this.cachedModel = anyFlash;
          return anyFlash;
        }

        // 3. Any model with "flash"
        const anyFlashGeneral = availableModels.find((m) => m.toLowerCase().includes('flash'));
        if (anyFlashGeneral) {
          this.cachedModel = anyFlashGeneral;
          return anyFlashGeneral;
        }

        // 4. Fallback to default
        if (availableModels.length > 0) {
          // Exclude experimental pro models with limit 0 if possible
          const nonPro = availableModels.find((m) => !m.toLowerCase().includes('pro'));
          if (nonPro) {
            this.cachedModel = nonPro;
            return nonPro;
          }
        }
      }
    } catch (err) {
      console.warn('Could not list Gemini models:', err);
    }

    this.cachedModel = this.defaultModel;
    return this.defaultModel;
  }

  async testConnection(): Promise<{ success: boolean; modelName?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'Chave Gemini API não fornecida' };
      }

      const model = await this.getBestAvailableModel();
      return { success: true, modelName: model };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede ao conectar à API Gemini' };
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

    if (!this.apiKey) {
      throw new Error('Chave Gemini API ausente. Configure a chave nas Definições.');
    }

    const commitsData = commits.map((c) => ({
      sha: c.sha.substring(0, 7),
      fullSha: c.sha,
      message: c.commit.message,
      date: c.commit.author.date.substring(0, 10),
      author: c.commit.author.name,
    }));

    const isEnglish = language === 'en';

    const systemPrompt = isEnglish
      ? `You are a Principal Technical Lead and Senior Project Manager creating formal Harvest timesheet entries.
Your task is to convert EACH software commit into its OWN individual executive Harvest timesheet task (1-to-1 mapping: 1 commit = 1 task).
Write exclusively in professional, corporate ENGLISH suitable for client timesheet reports.

Mandatory transformation rules:
1. 1 COMMIT = 1 TASK. For every commit provided in the input, output exactly one corresponding task object. Do NOT merge different commits together.
2. 'businessTitle': A concise, corporate title focused on user value or business deliverable (e.g. "Event Details Modal & Interactive Row-Click Integration", "DHIS2 Rules Engine Integration in Event Modal").
3. 'businessDescription': An elevated, professional Harvest timesheet note.
   CRITICAL CONSTRAINT: Must be SHORT, varying between 1 and 2 lines (approx 80-180 characters). Must be clear, direct, and explain WHAT was delivered or fixed and its operational benefit without fluff or unnecessary details.
4. 'spentDate': Must strictly match the commit's exact author date (YYYY-MM-DD).
5. 'sourceCommitShas': Array with exactly this commit's 7-character SHA.
6. 'suggestedHours': Realistic hour estimate for this individual commit (typically 0.5, 0.75, or 1.0).
7. Return only the strict JSON array schema requested.`
      : `Você é um Principal Technical Lead e Gestor de Projetos sénior a gerar notas de timesheet para o Harvest.
A sua tarefa é converter CADA commit de software na sua PRÓPRIA tarefa executiva individual para o Harvest (relação 1 para 1: 1 commit = 1 tarefa).
Escreva exclusivamente em PORTUGUÊS formal e profissional adequado para relatórios de clientes.

Regras obrigatórias de transformação:
1. 1 COMMIT = 1 TAREFA. Para cada commit fornecido na entrada, gere exatamente um objeto de tarefa correspondente. NÃO junte commits diferentes numa única tarefa.
2. 'businessTitle': Título conciso, corporativo e com foco no utilizador ou na funcionalidade entregue.
3. 'businessDescription': Uma nota de timesheet executiva formatada para o Harvest.
   RESTRIÇÃO CRÍTICA: Deve ser CURTA, variando entre 1 a 2 linhas (cerca de 80 a 180 caracteres). Deve ser clara, direta e explicar O QUE foi entregue ou corrigido e o benefício operacional, sem rodeios nem parágrafos longos.
4. 'spentDate': Deve corresponder estritamente à data exata do commit (formato YYYY-MM-DD).
5. 'sourceCommitShas': Array contendo apenas o SHA de 7 caracteres deste commit.
6. 'suggestedHours': Estimativa de horas para este commit individual (tipicamente 0.5, 0.75 ou 1.0).
7. Retorne apenas o schema JSON estrito solicitado.`;

    const userPrompt = isEnglish
      ? `Analyze and group the following ${commits.length} commits from repository ${repoName || 'the project'}:

${JSON.stringify(commitsData, null, 2)}

Group the logical commits and generate the timesheet tasks in English JSON format matching the schema.`
      : `Analise e agrupe os seguintes ${commits.length} commits do repositório ${repoName || 'do projeto'}:

${JSON.stringify(commitsData, null, 2)}

Agrupe os commits lógicos e gere as tarefas em formato JSON conforme o schema.`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              businessTitle: { type: 'STRING' },
              businessDescription: { type: 'STRING' },
              suggestedHours: { type: 'NUMBER' },
              spentDate: { type: 'STRING' },
              sourceCommitShas: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: [
              'id',
              'businessTitle',
              'businessDescription',
              'suggestedHours',
              'spentDate',
              'sourceCommitShas',
            ],
          },
        },
      },
    };

    // Execute request with dynamic model discovery and fallback
    const response = await this.executeWithModelFallback(payload);

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        // ignore
      }
      throw new Error(`Erro na API Gemini: ${errorMsg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new Error('Nenhuma resposta estruturada retornada pelo modelo Gemini.');
    }

    try {
      const parsedTasks: GeminiTaskItem[] = JSON.parse(candidate);
      return parsedTasks.map((t, idx) => ({
        id: t.id || `task-${Date.now()}-${idx + 1}`,
        businessTitle: t.businessTitle || 'Tarefa de Desenvolvimento',
        businessDescription: t.businessDescription || '',
        suggestedHours: Math.max(0.25, Number(t.suggestedHours) || 1.0),
        spentDate: t.spentDate || new Date().toISOString().substring(0, 10),
        sourceCommitShas: Array.isArray(t.sourceCommitShas) ? t.sourceCommitShas : [],
      }));
    } catch (parseErr: any) {
      console.error('Failed to parse Gemini JSON output:', candidate, parseErr);
      throw new Error('Não foi possível interpretar o JSON retornado pela IA Gemini.');
    }
  }

  async translateTasks(
    tasks: { id: string; businessTitle: string; businessDescription: string }[],
    targetLanguage: 'en' | 'pt' = 'en'
  ): Promise<{ id: string; businessTitle: string; businessDescription: string }[]> {
    if (!tasks || tasks.length === 0) return [];
    if (!this.apiKey) {
      throw new Error('Chave Gemini API ausente. Configure a chave nas Definições.');
    }

    const langName = targetLanguage === 'en' ? 'ENGLISH' : 'PORTUGUESE';
    const systemPrompt = `You are an expert bilingual corporate technical translator.
Translate the business title and business description of each software development timesheet task into professional, executive-level ${langName}.
Maintain high corporate standards suitable for Harvest client timesheets.
Preserve the exact 'id' for each item.
Return only the strict JSON array schema requested.`;

    const userPrompt = `Translate the following ${tasks.length} tasks into executive-level ${langName}:\n\n${JSON.stringify(
      tasks.map((t) => ({ id: t.id, businessTitle: t.businessTitle, businessDescription: t.businessDescription })),
      null,
      2
    )}`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    };

    // Execute translation request with dynamic model discovery and fallback
    const response = await this.executeWithModelFallback(payload);

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errorMsg = parsed.error.message;
      } catch {
        // ignore
      }
      throw new Error(`Erro na tradução com Gemini: ${errorMsg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Nenhuma resposta retornada pelo modelo Gemini para tradução.');
    }

    return JSON.parse(candidate);
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

  async improveTaskDescription(
    taskTitle: string,
    currentDescription: string,
    commitMessages: string[],
    language: 'en' | 'pt' = 'en'
  ): Promise<{ businessTitle: string; businessDescription: string }> {
    if (!this.apiKey) {
      throw new Error('Chave Gemini API ausente.');
    }

    const isEnglish = language === 'en';
    const systemPrompt = isEnglish
      ? `You are an elite Principal Technical Product Lead and executive writer.
Your job is to read raw Git commit messages and elevate them into a pristine, executive-level timesheet description and title in corporate ENGLISH.
CRITICAL MANDATORY RULES:
1. Thoroughly read each commit message and body. Identify the specific feature, bug fix, or refactoring.
2. 'businessTitle': A concise, corporate title focused on user value (e.g. "Event Details Modal & Interactive Row-Click Integration").
3. 'businessDescription': Clear, professional Harvest timesheet note. CRITICAL CONSTRAINT: Must be SHORT: between 1 and 2 lines (approx 80-180 characters). Explain WHAT was built or fixed and the direct operational benefit without fluff or unnecessary details.
4. FORBIDDEN: NEVER use generic boilerplate or placeholder text like "Completed core implementation and functional adjustments based on commits" or "stabilizing business rules and user-facing workflows".
5. Return strictly a JSON object with 'businessTitle' and 'businessDescription'.`
      : `Você é um Principal Technical Product Lead e redator executivo de topo.
O seu trabalho é ler as mensagens originais de commit do Git e elevá-las para uma descrição de entrega e título executivos para o Harvest em PORTUGUÊS formal.
REGRAS CRÍTICAS OBRIGATÓRIAS:
1. Leia atentamente cada commit. Identifique a funcionalidade específica, correção ou melhoria.
2. 'businessTitle': Título conciso e corporativo com foco no utilizador ou negócio.
3. 'businessDescription': Nota de timesheet clara e executiva para o Harvest. RESTRIÇÃO CRÍTICA: Deve ser CURTA, variando entre 1 a 2 linhas (cerca de 80 a 180 caracteres). Explique O QUE foi construído ou corrigido e o BENEFÍCIO REAL para os utilizadores, sem rodeios.
4. PROIBIDO: NUNCA utilize frases genéricas ou templates repetitivos como "Completed core implementation" ou "Implementação e validação de requisitos técnicos para X commits".
5. Retorne estritamente um objeto JSON com 'businessTitle' e 'businessDescription'.`;

    const userPrompt = `Read the original commits and elevate the task deliverables:
Current Title: ${taskTitle}
Current Description: ${currentDescription}

Original Git Commits:
${commitMessages.length > 0 ? commitMessages.map((m, i) => `Commit ${i + 1}:\n${m}`).join('\n---\n') : '(No commit details, elevate current title/description)'}

Generate the improved executive title and non-technical business description in ${isEnglish ? 'English' : 'Portuguese'} as JSON.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            businessTitle: { type: 'STRING' },
            businessDescription: { type: 'STRING' },
          },
          required: ['businessTitle', 'businessDescription'],
        },
      },
    };

    const response = await this.executeWithModelFallback(payload);
    if (!response.ok) {
      const errText = await response.text();
      let msg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch {
        // ignore
      }
      throw new Error(`Gemini API error: ${msg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Nenhuma resposta retornada pela IA.');
    }

    const parsed = JSON.parse(candidate);
    return {
      businessTitle: parsed.businessTitle || taskTitle,
      businessDescription: parsed.businessDescription || currentDescription,
    };
  }

  private async executeWithModelFallback(payload: any): Promise<Response> {
    const primary = await this.getBestAvailableModel();
    let response = await this.callGeminiApi(primary, payload);

    // If 404 (Not Found), 429 (Quota Exceeded / Rate Limit), 403 (Forbidden), or 400 (Bad Request)
    if (!response.ok && [400, 403, 404, 429].includes(response.status)) {
      console.warn(`Gemini model ${primary} returned ${response.status}, attempting Free Tier Flash fallbacks...`);

      const candidateModels = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash-exp',
      ].filter((m) => m !== primary);

      for (const fallback of candidateModels) {
        response = await this.callGeminiApi(fallback, payload);
        if (response.ok) {
          this.cachedModel = fallback;
          console.info(`Gemini successfully switched to model: ${fallback}`);
          return response;
        }
      }

      // Also attempt v1 stable endpoint if v1beta failed
      for (const fallback of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${fallback}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        if (response.ok) {
          this.cachedModel = fallback;
          return response;
        }
      }
    }

    return response;
  }

  private async callGeminiApi(model: string, body: any): Promise<Response> {
    const cleanModel = model.replace(/^models\//, '');
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
  }
}
