import { GeminiTaskItem, GitHubCommit } from '../types';

export class GeminiService {
  private apiKey: string;
  private primaryModel = 'gemini-2.5-flash';
  private fallbackModel = 'gemini-1.5-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  async testConnection(): Promise<{ success: boolean; modelName?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'Chave Gemini API não fornecida' };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.error?.message || response.statusText;
        return { success: false, error: `Falha na autenticação Gemini: ${errorMsg}` };
      }

      return { success: true, modelName: this.primaryModel };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede ao conectar à API Gemini' };
    }
  }

  async transformCommitsToTasks(
    commits: GitHubCommit[],
    repoName?: string
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

    const systemPrompt = `Você é um Principal Technical Lead e Gestor de Projetos sénior especializado em traduzir trabalho técnico de engenharia de software para clientes executivos e timesheets formais de negócios.
Você escreve exclusivamente em PORTUGUÊS (padrão formal e profissional de Portugal e Moçambique, sem calão, sem jargões de código cru).

Regras obrigatórias de transformação:
1. Agrupe micro-commits correlacionados (ex: múltiplos fixes, refactorings ou commits no mesmo módulo/funcionalidade na mesma data) numa única tarefa executiva com sentido de negócio.
2. Elimine qualquer jargão técnico irrelevante para clientes (ex: nomes de variáveis, classes, tipos, lint, bump de versões, merged branch, hashs de commits, PR #123).
3. 'businessTitle': Deve ser um título conciso, corporativo e com foco no utilizador ou na funcionalidade de negócio (ex: "Exportação de Dados e Relatórios de Utilizadores", "Otimização do Fluxo de Autenticação", "Resolução de Inconsistências no Painel Financeiro").
4. 'businessDescription': Parágrafo bem redigido e profissional detalhando o benefício de negócio e o escopo entregue, sem rodeios.
5. 'suggestedHours': Estimar um número realista de horas com base no escopo e complexidade do agrupamento (incrementos de 0.25, 0.5, 0.75 ou 1.0, ex: 0.5, 1.25, 2.0, 3.5).
6. 'spentDate': Formato YYYY-MM-DD retirado da data predominante dos commits agrupados.
7. 'sourceCommitShas': Lista exata dos 7-caracteres SHAs (ou SHAs completos) pertencentes a esta tarefa agrupada.
8. Retorne apenas o schema JSON estrito solicitado.`;

    const userPrompt = `Analise e agrupe os seguintes ${commits.length} commits do repositório ${repoName || 'do projeto'}:

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

    // Try primary model, fallback to alternative if 404/not available
    let response = await this.callGeminiApi(this.primaryModel, payload);
    if (!response.ok && (response.status === 404 || response.status === 400)) {
      console.warn(`Model ${this.primaryModel} failed with ${response.status}, attempting ${this.fallbackModel}...`);
      response = await this.callGeminiApi(this.fallbackModel, payload);
    }

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

  private async callGeminiApi(model: string, body: any): Promise<Response> {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
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
