/* 333 刷题题库装配入口
   题目分片（assets/data/quiz/*.js）通过 window.K3_QRAW.push(...) 追加；
   这里只登记题库目录。字段：{id,bank,subj,ch,q,opts,a,exp,type,src:{book,ver,page}} */
window.K3_QBANKS = window.K3_QBANKS || [
  { id: "q1200", name: "冬青 · 选择题 1200 题", short: "冬青1200" },
  { id: "dd1000", name: "丹丹 · 1000 题", short: "丹丹1000" },
  { id: "kc", name: "凯程 · 应试题库", short: "凯程" },
  { id: "zhenti", name: "历年真题 · 单选", short: "真题" },
  { id: "mock", name: "模拟冲刺卷 · 单选", short: "模拟卷" },
  { id: "bills", name: "外教史 59 法案", short: "法案" }
];
window.K3_QRAW = window.K3_QRAW || [];