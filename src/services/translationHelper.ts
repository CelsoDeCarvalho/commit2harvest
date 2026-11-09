export function translateFallback(
  title: string,
  description: string,
  targetLang: 'en' | 'pt'
): { title: string; description: string } {
  const dictionaryPTtoEN: Record<string, string> = {
    'Módulo de Exportação de Dados e Otimização de Relatórios':
      'Data Export Module & Report Streaming Optimization',
    'Implementação do mecanismo de exportação em lote para formato Excel e correção nos filtros de unidades organizacionais, garantindo maior estabilidade no processamento de grandes volumes.':
      'Implemented bulk Excel streaming export handlers and organizational unit filter validation to ensure system reliability under large datasets.',
    'Melhorias de Segurança e Controlo de Acessos':
      'Security Hardening & Session Access Control',
    'Integração de verificação em duas etapas (TOTP) no fluxo de autenticação e atualização preventiva de dependências para reforço dos padrões de segurança.':
      'Integrated two-factor authentication (TOTP) into the login pipeline and proactively upgraded dependencies to meet security compliance standards.',
    'Manutenção Evolutiva e Correções no Sistema':
      'Continuous System Engineering & Defect Resolution',
    'Desenvolvimento de melhorias contínuas, validação de regras de negócio e triagem de anomalias operacionais.':
      'Ongoing platform enhancements, verification of core business rules, and technical resolution of operational anomalies.',
    'Desenvolvimento e Suporte Técnico Especializado':
      'Specialized Engineering & Technical Consulting',
    'Atividades de engenharia de software, reuniões técnicas e suporte aos utilizadores da plataforma.':
      'Software engineering activities, technical architecture meetings, and platform support.',
  };

  const dictionaryENtoPT: Record<string, string> = {
    'Data Export Module & Report Streaming Optimization':
      'Módulo de Exportação de Dados e Otimização de Relatórios',
    'Implemented bulk Excel streaming export handlers and organizational unit filter validation to ensure system reliability under large datasets.':
      'Implementação do mecanismo de exportação em lote para formato Excel e correção nos filtros de unidades organizacionais, garantindo maior estabilidade no processamento de grandes volumes.',
    'Security Hardening & Session Access Control':
      'Melhorias de Segurança e Controlo de Acessos',
    'Integrated two-factor authentication (TOTP) into the login pipeline and proactively upgraded dependencies to meet security compliance standards.':
      'Integração de verificação em duas etapas (TOTP) no fluxo de autenticação e atualização preventiva de dependências para reforço dos padrões de segurança.',
    'Continuous System Engineering & Defect Resolution':
      'Manutenção Evolutiva e Correções no Sistema',
    'Ongoing platform enhancements, verification of core business rules, and technical resolution of operational anomalies.':
      'Desenvolvimento de melhorias contínuas, validação de regras de negócio e triagem de anomalias operacionais.',
    'Specialized Engineering & Technical Consulting':
      'Desenvolvimento e Suporte Técnico Especializado',
    'Software engineering activities, technical architecture meetings, and platform support.':
      'Atividades de engenharia de software, reuniões técnicas e suporte aos utilizadores da plataforma.',
  };

  if (targetLang === 'en') {
    const matchedTitle = dictionaryPTtoEN[title.trim()] || title;
    const matchedDesc = dictionaryPTtoEN[description.trim()] || description;
    return {
      title: matchedTitle !== title ? matchedTitle : `[EN] ${title}`,
      description: matchedDesc !== description ? matchedDesc : `${description} (Translated to English)`,
    };
  } else {
    const matchedTitle = dictionaryENtoPT[title.trim()] || title;
    const matchedDesc = dictionaryENtoPT[description.trim()] || description;
    return {
      title: matchedTitle !== title ? matchedTitle : `[PT] ${title.replace(/^\[EN\]\s*/, '')}`,
      description: matchedDesc !== description ? matchedDesc : `${description.replace(/\s*\(Translated to English\)/, '')} (Traduzido para Português)`,
    };
  }
}
