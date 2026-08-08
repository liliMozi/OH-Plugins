const root = document.getElementById("root");

function lines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function checkedList(items, fallback) {
  const values = items.length ? items : [fallback];
  return values.map((item) => `- [ ] ${item}`).join("\n");
}

function buildBrief() {
  const goal = document.getElementById("goal").value.trim() || "待填写目标";
  const stack = document.getElementById("stack").value.trim() || "待确认";
  const context = document.getElementById("context").value.trim() || "待检索仓库后补充";
  const constraints = lines(document.getElementById("constraints").value);
  const acceptance = lines(document.getElementById("acceptance").value);
  const risk = document.getElementById("risk").value;

  return `# Hanako 工程任务\n\n## 目标\n${goal}\n\n## 技术环境\n${stack}\n\n## 已知上下文\n${context}\n\n## 约束\n${checkedList(constraints, "确认允许修改的目录、依赖与兼容范围")}\n\n## 验收标准\n${checkedList(acceptance, "补充至少一条可观察、可复现的完成条件")}\n\n## 风险等级\n${risk}\n\n## 执行要求\n1. 先读取仓库规则、相关实现、调用方和现有测试。\n2. 列出最小改动计划与预计修改文件。\n3. 只做服务当前目标的改动，不夹带无关重构。\n4. 运行与改动范围匹配的测试、类型检查或构建。\n5. 报告实际验证证据、残余风险和未覆盖项。`;
}

function updatePreview() {
  const preview = document.getElementById("preview");
  if (preview) preview.textContent = buildBrief();
}

function render() {
  if (!root) return;
  root.innerHTML = `
    <main class="forge-shell">
      <header class="hero">
        <div class="brand-mark" aria-hidden="true">&lt;/&gt;</div>
        <div class="hero-copy">
          <p class="eyebrow">HANAKO DEVELOPMENT PROTOCOL</p>
          <h1>Code Forge</h1>
          <p class="lede">把模糊想法锻造成可执行、可验证、可回滚的工程任务。</p>
        </div>
        <div class="status"><span></span> 协议已就绪</div>
      </header>

      <section class="protocol-strip" aria-label="工作流">
        <div><b>01</b><span>建立事实</span></div>
        <i></i>
        <div><b>02</b><span>约束改动</span></div>
        <i></i>
        <div><b>03</b><span>验证证据</span></div>
      </section>

      <div class="workspace">
        <section class="editor-card">
          <div class="section-heading">
            <div><span class="section-index">A</span><h2>任务输入</h2></div>
            <p>每行一条约束或验收标准</p>
          </div>
          <label class="field field-wide">
            <span>目标 <em>必填</em></span>
            <textarea id="goal" rows="3" placeholder="例如：修复设置页切换主题后，重启应用丢失选择的问题"></textarea>
          </label>
          <div class="field-grid">
            <label class="field">
              <span>技术栈</span>
              <input id="stack" type="text" placeholder="TypeScript + React">
            </label>
            <label class="field">
              <span>风险等级</span>
              <select id="risk">
                <option>待评估</option>
                <option>低风险</option>
                <option>中等风险</option>
                <option>高风险</option>
              </select>
            </label>
          </div>
          <label class="field field-wide">
            <span>已知上下文</span>
            <textarea id="context" rows="3" placeholder="相关目录、报错、现有行为、已经尝试过的方案"></textarea>
          </label>
          <div class="field-grid">
            <label class="field">
              <span>工程约束</span>
              <textarea id="constraints" rows="5" placeholder="不新增依赖\n兼容现有配置格式"></textarea>
            </label>
            <label class="field">
              <span>验收标准</span>
              <textarea id="acceptance" rows="5" placeholder="切换后立即生效\n重启后保留选择"></textarea>
            </label>
          </div>
        </section>

        <section class="output-card">
          <div class="section-heading">
            <div><span class="section-index">B</span><h2>工程简报</h2></div>
            <span class="live-tag">LIVE</span>
          </div>
          <pre id="preview"></pre>
          <div class="actions">
            <button id="resetBtn" class="button secondary" type="button">清空</button>
            <button id="copyBtn" class="button primary" type="button">复制给 Hanako</button>
          </div>
        </section>
      </div>

      <footer class="footer-note">
        <span>FORGE RULE</span>
        <p>先有证据，再有改动；先定义通过，再宣布完成。</p>
      </footer>
    </main>
  `;

  root.querySelectorAll("input, textarea, select").forEach((control) => {
    control.addEventListener("input", updatePreview);
    control.addEventListener("change", updatePreview);
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    root.querySelectorAll("input, textarea").forEach((control) => { control.value = ""; });
    document.getElementById("risk").value = "待评估";
    updatePreview();
  });

  const copyBtn = document.getElementById("copyBtn");
  copyBtn.addEventListener("click", async () => {
    const original = copyBtn.textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("当前 WebView 不允许访问剪贴板，请从右侧预览手动复制。");
      await navigator.clipboard.writeText(buildBrief());
      copyBtn.textContent = "已复制";
    } catch (error) {
      copyBtn.textContent = error.message || "复制失败，请手动复制";
    } finally {
      window.setTimeout(() => { copyBtn.textContent = original; }, 2600);
    }
  });

  updatePreview();
}

render();
