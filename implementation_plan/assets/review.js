function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function buildPrompt() {
  const pageTitle = document.body.dataset.pageTitle || document.title;
  const sources = [...document.querySelectorAll('.review-source')];
  const items = sources
    .map((source) => ({
      target: source.dataset.reviewTitle || '',
      text: source.querySelector('textarea')?.value.trim() || '',
    }))
    .filter((item) => item.text.length > 0);

  const lines = [
    '# レビュー指摘の反映',
    '',
    '以下のレビュー指摘に基づいて該当箇所を修正してください。',
    '',
    `## ${pageTitle}`,
  ];

  if (items.length === 0) {
    lines.push('- 対象: 「」');
    lines.push('  指摘: ');
  } else {
    for (const item of items) {
      lines.push(`- 対象: 「${item.target}」`);
      lines.push(`  指摘: ${item.text.replace(/\n/g, '\n    ')}`);
    }
  }

  return lines.join('\n');
}

function refreshPromptOutput() {
  const output = document.getElementById('promptOutput');
  if (output) output.value = buildPrompt();
}

async function copyPrompt() {
  const prompt = buildPrompt();
  refreshPromptOutput();
  try {
    await navigator.clipboard.writeText(prompt);
    showToast('レビュー反映プロンプトをコピーしました');
  } catch {
    const output = document.getElementById('promptOutput');
    if (output) {
      output.focus();
      output.select();
      document.execCommand('copy');
      showToast('レビュー反映プロンプトをコピーしました');
    }
  }
}

function downloadPrompt() {
  const prompt = buildPrompt();
  refreshPromptOutput();
  const slug = document.body.dataset.pageSlug || 'review';
  const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `review_prompt_${slug}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Markdownファイルを生成しました');
}

function clearReviewInputs() {
  document.querySelectorAll('.review-source textarea').forEach((textarea) => {
    textarea.value = '';
  });
  refreshPromptOutput();
  showToast('レビュー入力をクリアしました');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.review-source textarea').forEach((textarea) => {
    textarea.addEventListener('input', refreshPromptOutput);
  });
  document.getElementById('copyPromptBtn')?.addEventListener('click', copyPrompt);
  document.getElementById('downloadPromptBtn')?.addEventListener('click', downloadPrompt);
  document.getElementById('clearPromptBtn')?.addEventListener('click', clearReviewInputs);
  refreshPromptOutput();
});
