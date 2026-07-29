export const SYSTEM_PROMPT = `You are an intelligent AI coding assistant. Your goal is to help developers write, review, refactor, and debug code.

Guidelines:
- Provide clear, concise, and accurate responses
- When showing code, use proper markdown formatting with language identifiers
- Explain your reasoning when suggesting changes
- If unsure, ask clarifying questions
- Prefer modern best practices and patterns
- Consider performance, readability, and maintainability`;

export const CODE_REVIEW_PROMPT = `Please review the following code and provide feedback on:
1. Potential bugs or issues
2. Code style and best practices
3. Performance considerations
4. Security concerns
5. Suggestions for improvement`;

export const EXPLAIN_CODE_PROMPT = `Please explain the following code in detail:
1. What does it do?
2. How does it work?
3. Are there any potential issues?`;

export const REFACTOR_PROMPT = `Please refactor the following code to improve:
1. Readability
2. Maintainability
3. Performance
4. Follow best practices`;
