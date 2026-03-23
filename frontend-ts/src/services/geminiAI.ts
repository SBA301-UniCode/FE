/**
 * Gemini AI Service for Code Testing
 * Integrates with Gemini 2.0 Flash API for AI-powered coding assistance
 */

const GEMINI_API_KEY = 'AIzaSyA0pNIME7rEQo5Zq-fA8oqmA5BYYW7mjiQ'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

export interface AICodeRequest {
  code: string
  language: string
  description: string
  testResults?: { input: string; expected: string; actual: string; passed: boolean }[]
  mode: 'hint' | 'explain_error' | 'review' | 'suggest_fix'
}

function buildPrompt(req: AICodeRequest): string {
  const langLabel = req.language === 'JAVA' ? 'Java' : req.language === 'PYTHON' ? 'Python' : req.language
  const base = `Bạn là một gia sư lập trình. Ngôn ngữ: ${langLabel}.
Bài toán: ${req.description || 'Không có mô tả'}
Code của học viên:
\`\`\`${langLabel.toLowerCase()}
${req.code || '// (chưa viết code)'}
\`\`\``

  switch (req.mode) {
    case 'hint':
      return `${base}

Hãy cho 1-2 gợi ý nhỏ để giúp học viên đi đúng hướng. KHÔNG tiết lộ đáp án hoặc code hoàn chỉnh. Hãy khuyến khích và tích cực. Trả lời bằng tiếng Việt.`

    case 'explain_error':
      return `${base}

Kết quả test:
${req.testResults?.map((t, i) => `Case ${i + 1}: Input: ${t.input}, Expected: ${t.expected}, Actual: ${t.actual} → ${t.passed ? 'PASS ✅' : 'FAIL ❌'}`).join('\n') || 'Chưa có kết quả test'}

Hãy giải thích TẠI SAO code bị lỗi ở các test case FAIL. Phân tích logic sai ở đâu. KHÔNG đưa ra code sửa hoàn chỉnh. Trả lời bằng tiếng Việt.`

    case 'review':
      return `${base}

Hãy review chất lượng code: naming, cấu trúc, hiệu năng, edge cases. Cho điểm từ 1-10 và gợi ý cải thiện. Trả lời bằng tiếng Việt.`

    case 'suggest_fix':
      return `${base}

${req.testResults?.length ? `Kết quả test:\n${req.testResults.map((t, i) => `Case ${i + 1}: Input: ${t.input}, Expected: ${t.expected}, Actual: ${t.actual} → ${t.passed ? 'PASS' : 'FAIL'}`).join('\n')}` : ''}

Hãy gợi ý HƯỚNG sửa (approach), KHÔNG cho code hoàn chỉnh. Chỉ ra phần nào cần thay đổi và tại sao. Trả lời bằng tiếng Việt.`
  }
}

export const askGeminiCode = async (req: AICodeRequest): Promise<string> => {
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(req) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini không trả về phản hồi.')
    return text
  } catch (e: unknown) {
    const err = e as { message?: string }
    throw new Error(err.message || 'Lỗi kết nối Gemini AI')
  }
}
