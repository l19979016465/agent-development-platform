/**
 * 对话调试接口（Mock 实现）
 *
 * 原型阶段不接入真实大模型，改为按智能体分类生成模拟回复，
 * 并以逐字推送的方式模拟流式输出效果，便于演示。
 * 后续接入真实模型时，将 streamChatApi 替换为 SSE / WebSocket 请求即可。
 */

/** 按智能体分类准备的应答模板 */
const CATEGORY_REPLIES = {
  客服问答: (q) => [
    '我先帮您确认一下情况：',
    `1. 关于您提到的「${q}」，已为您检索到相关的服务条款；`,
    '2. 该问题属于常见咨询场景，通常在 1 个工作日内可处理完毕；',
    '3. 如需进一步核实订单信息，请提供订单号，我将为您查询具体进度。',
    '',
    '请问还需要了解其他内容吗？',
  ],
  文档处理: (q) => [
    '根据知识库中的相关文档，为您整理如下：',
    `· 您询问的「${q}」在《管理制度汇编》第 3 章中有明确规定；`,
    '· 办理流程为：提交申请 → 部门审批 → 人事备案，全程线上完成；',
    '· 需要注意的时限要求是提前 3 个工作日提交，逾期将顺延至下一周期。',
    '',
    '以上结论均基于知识库原文，如需查看条款出处我可以进一步展开。',
  ],
  代码开发: (q) => [
    '我从可读性、健壮性和性能三个角度给出建议：',
    `· 可读性：围绕「${q}」的逻辑建议拆分为独立函数，并补充必要注释；`,
    '· 健壮性：建议补充入参校验与异常捕获，避免边界条件下抛错；',
    '· 性能：该处若处于循环中，建议提前缓存重复计算结果，减少重复开销。',
    '',
    '需要我针对某一段具体代码做详细审查吗？可以把代码贴过来。',
  ],
  数据分析: (q) => [
    '在开始分析前，我先明确一下分析口径：',
    `· 分析目标：围绕「${q}」拆解为可量化的指标；`,
    '· 数据范围：建议取近 3 个月数据，并排除异常波动区间；',
    '· 分析维度：按时间趋势、渠道分布、用户分层三个维度交叉对比。',
    '',
    '确认口径后，我可以给出具体的结论与可视化建议。',
  ],
  办公助手: (q) => [
    '已为您整理如下：',
    `· 议题：「${q}」；`,
    '· 结论：需在下次评审前完成方案初稿，并同步相关方确认；',
    '· 待办事项：① 整理需求清单（责任人待定）；② 输出排期计划（责任人待定）。',
    '',
    '需要我按其他格式（如邮件、周报）重新整理吗？',
  ],
}

/** 兜底回复 */
function defaultReply(q) {
  return [
    `我理解您想了解的是「${q}」。`,
    '',
    '基于当前配置，我给出的初步回应是：该问题可以从背景、现状和建议三个层面来看，',
    '建议先明确目标与约束条件，再逐步推进。',
    '',
    '如需更具体的回答，可以补充一些背景信息，我会进一步说明。',
  ]
}

/** 组装一条完整回复 */
function buildReply(agent, question) {
  const q = question.trim()
  const short = q.length > 18 ? `${q.slice(0, 18)}…` : q
  const builder = CATEGORY_REPLIES[agent?.category] || defaultReply
  const lines = typeof builder === 'function' ? builder(short) : builder
  return lines.join('\n')
}

/**
 * 流式对话（Mock）
 * @param {object} options
 * @param {object} options.agent     当前智能体
 * @param {string} options.question  用户提问
 * @param {(text: string) => void} options.onChunk 每产生一段文本时回调
 * @returns {{promise: Promise<string>, stop: () => void}}
 */
export function streamChatApi({ agent, question, onChunk }) {
  const full = buildReply(agent, question)
  let index = 0
  let stopped = false
  let timer = null

  const promise = new Promise((resolve) => {
    timer = setInterval(() => {
      if (stopped) {
        clearInterval(timer)
        resolve(full.slice(0, index))
        return
      }
      // 每次推送 1~3 个字符，模拟打字机效果
      index = Math.min(full.length, index + 1 + Math.floor(Math.random() * 3))
      onChunk(full.slice(0, index))
      if (index >= full.length) {
        clearInterval(timer)
        resolve(full)
      }
    }, 26)
  })

  return {
    promise,
    stop() {
      stopped = true
    },
  }
}
