/* ============================================================
   SEO / GEO landing-page micro-site i18n.
   Self-contained language switcher (繁 / EN / 简) for the
   landing + thank-you pages. Does NOT touch rerenderer.js and
   does not affect the main WordPress site.

   Usage in markup:
     <element data-i18n="key">…</element>        -> textContent
     <element data-i18n-html="key">…</element>   -> innerHTML
     <input  data-i18n-ph="key">                 -> placeholder
   The Traditional-Chinese copy already in the DOM is captured on
   load and used as the "zh-Hant" baseline, so only en + zh-hans
   need dictionaries below.
   ============================================================ */
(function () {
  "use strict";

  var DICT = {
    en: {
      /* ---- hero ---- */
      hero_tag: "SEO / GEO LIMITED OFFER",
      hero_title: 'In every recommendation,<br><span class="accent">your brand is always the core answer.</span><br>Get 2 months of free SEO / GEO service.',
      fineprint: "*Requires a signed contract of 9 months or longer",
      hero_email_ph: "Enter your email address",
      hero_cta: "Get my free AI visibility report",
      logos_heading: "OFFICIALLY CERTIFIED · TRUSTED BY THE INDUSTRY",
      /* ---- why unique logic ---- */
      why_tag: "WHY UNIQUE LOGIC",
      why_title: "Why choose Unique Logic?",
      why_desc: "From start-ups to multinationals, Unique Logic helps industry leaders across sectors multiply their revenue.",
      marquee_label: "Trusted by leading companies across industries",
      /* ---- SEO advantages ---- */
      seo_tag: "SEO ADVANTAGES",
      seo_title: "Three core SEO advantages",
      seo1_h: "Targeting real search pain points",
      seo1_p: "We know that if a website fails to appear on the first page of Google, the brand loses the vast majority of its exposure. Through in-depth site audits and keyword optimisation, we solve the “great content, no traffic” dilemma and ensure your business shows up in the most critical position when users actively search.",
      seo2_h: "Tailor-made execution plans",
      seo2_p: "We never use one-size-fits-all templates. Instead, we build precise SEO execution plans around each industry’s pain points and competitive landscape — from competitor analysis to on-site content optimisation — so every action drives real business growth.",
      seo3_h: "A results-driven, hands-on path",
      seo3_p: "We deliver genuine SEO engineering, not marketing talk. We focus on real issues in site architecture, keyword mapping and backlinks, turning your website into an asset that attracts qualified customers and measurably lifts acquisition and sales.",
      /* ---- GEO advantages ---- */
      geo_tag: "GEO ADVANTAGES",
      geo_title: "Three core GEO advantages",
      geo1_h: "AI semantic coverage",
      geo1_p: "We optimise your content to fit the logic of large language models, so that when AI assistants (such as ChatGPT / Gemini) generate answers, your brand is naturally cited as an authoritative recommendation.",
      geo2_h: "Precise reach via structured data",
      geo2_p: "By restructuring your business information, we help AI recognise your brand value more accurately and surface the information that best matches user intent in smart-recommendation scenarios.",
      geo3_h: "A win-win search layout",
      geo3_p: "Our GEO strategy not only raises your weight in AI search, it also deepens the logic of your content — so AI authority and users’ active search experience grow together.",
      /* ---- stats ---- */
      stat1_label: "Success cases",
      stat2_label: "Client satisfaction",
      stat3_label: "Years of experience",
      stat4_label: "Professional support",
      /* ---- bottom CTA band ---- */
      cta_h2: "Ready to let AI recommend your brand?",
      cta_p: "Claim 2 months of free SEO / GEO service now and seize the lead in the AI-search era.",
      cta_btn: "Claim your free plan",
      /* ---- why seo & geo matters ---- */
      seogeo_tag: "SEO & GEO",
      seogeo_title: "Why do SEO and GEO matter?",
      why_seo_h: '<span class="lp-why-kicker">SEO</span> Search Engine Optimisation',
      why_seo_p: "SEO is the strategic process of deeply optimising site architecture, technical standards and content quality to secure a core position on the search engine results page (SERP). Today, users rely on first-page results for 75% of their actions; SEO not only solves the exposure gap and traffic bottleneck caused by low rankings, it is also a key asset for building long-term authority and acquiring qualified customers. With SEO we don’t just lift click-through rates — we optimise the whole conversion path so every visitor becomes a source of potential value.",
      why_geo_h: '<span class="lp-why-kicker">GEO</span> AI Search Optimisation',
      why_geo_p: "GEO (AI search optimisation) is the new arena for the era of intelligent interaction. As large language models become the primary gateway to information, users no longer search only by keywords — they ask conversational, complex questions to answer engines. GEO’s core is a high-quality, rigorously structured content system that provides authoritative reference data to AI engines, so your brand is “cited” and “recommended” in AI answers. If SEO wins the “entrance” in traditional search, GEO establishes “authority” in AI interaction. Built on a solid SEO foundation, GEO gives your brand an irreplaceable position in AI-generated answers — a leap from passive discovery to active brand placement.",
      offer_tag: "LIMITED SEO / GEO OFFER",
      offer_title: 'Don’t wait.<br><span>Claim 2 months of free SEO / GEO service now.</span>',
      offer_desc: "Let Unique Logic review your AI visibility, search ranking and content opportunities, then identify the highest-value growth actions for your website.",
      offer_btn: "Claim your free plan",
      offer_note: "Limited availability. Applies to contracts of 9 months or longer.",
      /* ---- footer ---- */
      footer_title: "Contact Us",
      footer_addr: "Room 1007, The Bay Hub, 17 Kai Cheung Road, Kowloon Bay, Hong Kong",
      footer_wechat: "WeChat: UniqueLogic393",
      copyright: "© 2026 Unique Logic Limited | All Rights Reserved",
      /* ---- lead modal ---- */
      modal_title: "Please enter your details",
      modal_sub: "Once submitted, our digital strategist will prepare your free AI visibility report as soon as possible.",
      modal_ph_name: "First name *",
      modal_ph_phone: "Contact number *",
      modal_ph_email: "Email address *",
      modal_ph_website: "Website (optional)",
      modal_submit: "Get my free AI visibility report",
      /* ---- thank-you page ---- */
      back_btn: "Back to previous page",
      ty_title: 'Your report is on the way!<br><span class="accent">We’ve received your enquiry.</span>',
      ty_sub: "Your dedicated digital strategist will contact you within one business day and prepare your free AI visibility report.",
      ty_call: "Prefer to talk now? Call <strong>+852 8400 7393</strong>",
      loc_section_title: "Contact Details",
      loc_addr_label: "ADDRESS",
      loc_addr_value: "Room 1007, The Bay Hub,<br>17 Kai Cheung Road, Kowloon Bay, Hong Kong",
      loc_phone_label: "PHONE",
      loc_hours_label: "HOURS",
      loc_hours_value: "Mon – Fri　09:00 – 18:00<br>Closed on weekends & public holidays",
      loc_wechat_label: "WECHAT",
      loc_email_label: "EMAIL",
      social_title: "SOCIAL"
    },

    "zh-hans": {
      hero_tag: "SEO / GEO 限时方案",
      hero_title: '在每一次推荐中，<br><span class="accent">您的品牌始终是核心答案。</span><br>获取 2 个月免费 SEO/GEO 服务。',
      fineprint: "*签约 9 个月及以上的合同",
      hero_email_ph: "输入您的电邮地址",
      hero_cta: "领取您的免费 AI 曝光度诊断报告",
      logos_heading: "权威认证 · 深受业界信赖",
      why_tag: "WHY UNIQUE LOGIC",
      why_title: "为什么选择 Unique Logic？",
      why_desc: "从初创品牌到跨国企业，Unique Logic 助力各行业先行者实现收益倍增。",
      marquee_label: "深受各行业领先企业信赖",
      seo_tag: "SEO ADVANTAGES",
      seo_title: "SEO 三大核心优势",
      seo1_h: "直击搜索痛点",
      seo1_p: "我们深知，如果网站无法出现在 Google 搜索结果的第一页，品牌将失去绝大多数的曝光机会。针对这一核心难题，我们通过深入的网站审计与关键词优化，解决网站「有内容却无流量」的困境，确保您的业务在用户主动搜索时出现在最关键的位置。",
      seo2_h: "量身定制的执行方案",
      seo2_p: "我们不提供标准化的模板，而是针对不同行业的痛点与竞争环境，制定精准的 SEO 执行方案。从竞争对手分析到站内内容优化，我们致力于解决每一位客户的具体需求，确保每一项 SEO 工作都切实作用于您的业务增长。",
      seo3_h: "结果导向的实战路径",
      seo3_p: "我们提供的是实实在在的 SEO 技术服务，而非营销空谈。我们专注于解决网站架构、关键词布局以及反向链接中的实际问题，通过持续的技术支持，将您的网站转化为吸引精准客户的有效资产，从而显著提升获客率与销售额。",
      geo_tag: "GEO ADVANTAGES",
      geo_title: "GEO 三大核心优势",
      geo1_h: "AI 智能语义覆盖",
      geo1_p: "我们优化您的网站内容以适配大语言模型的逻辑，确保在 AI 聊天机器人（如 ChatGPT/Gemini）生成回答时，您的品牌被自然引用并作为权威建议。",
      geo2_h: "结构化数据精准触达",
      geo2_p: "通过将您的业务信息进行结构化改造，我们能让 AI 更准确地识别您的品牌价值，确保在智能推荐场景中展现出最符合用户意图的信息。",
      geo3_h: "人机双赢的搜索布局",
      geo3_p: "我们的 GEO 策略不仅提升 AI 搜索权重，同时强化内容的逻辑深度，确保 AI 搜索的权威性提升与用户的主动检索体验同步增长。",
      stat1_label: "成功案例",
      stat2_label: "客户满意度",
      stat3_label: "年行业经验",
      stat4_label: "专业支援",
      cta_h2: "准备好让 AI 主动推荐您的品牌了吗？",
      cta_p: "立即领取 2 个月免费 SEO / GEO 服务，抢占 AI 搜寻时代的先机。",
      cta_btn: "立即领取免费方案",
      seogeo_tag: "SEO & GEO",
      seogeo_title: "为什么 SEO 与 GEO 至关重要？",
      why_seo_h: '<span class="lp-why-kicker">SEO</span> 搜索引擎优化',
      why_seo_p: "SEO（搜索引擎优化）是通过深度优化网站架构、技术规范与内容质量，确保品牌在搜索引擎结果页面 (SERP) 中占据核心位置的战略过程。在当前数字化环境下，用户 75% 的行为依赖于搜索首页的直接结果，SEO 不仅能有效解决品牌因排名靠后而导致的曝光缺失与流量瓶颈，更是品牌构建长期行业权威与获取精准获客的关键资产。通过 SEO，我们不仅仅是在提升点击率，更是在优化整个网站的转化路径，让每一位搜索访客都能成为品牌的潜在价值来源。",
      why_geo_h: '<span class="lp-why-kicker">GEO</span> AI 搜索优化',
      why_geo_p: "GEO（AI 搜索优化）是企业在智能交互时代布局的新赛道。随着大语言模型成为用户获取信息的主要入口，用户不再仅仅通过关键词搜索，而是通过向智能回答引擎发起对话式的复杂提问。GEO 的核心在于通过高质量、逻辑严密的结构化内容体系，为 AI 引擎提供权威的参考数据，使您的品牌在智能回答中被「引用」与「推荐」。如果说 SEO 是在传统搜索中赢取「入口」，那么 GEO 就是在 AI 交互中确立「权威」。建立在稳固 SEO 基础之上的 GEO 策略，能让您的品牌在智能回答的生成场景中占据不可替代的位置，从而实现从被动检索到主动品牌植入的跨越。",
      offer_tag: "SEO / GEO 限时优惠",
      offer_title: '别再等待。<br><span>立即领取 2 个月免费 SEO / GEO 服务。</span>',
      offer_desc: "让 Unique Logic 为您的网站检视 AI 曝光度、搜索排名与内容机会，找出下一步最值得投放的增长位置。",
      offer_btn: "立即领取免费方案",
      offer_note: "名额有限，适用于签约 9 个月及以上的合同。",
      footer_title: "联络我们",
      footer_addr: "香港九龙湾启祥道 17 号 太丰汇 1007 室",
      footer_wechat: "微信：UniqueLogic393",
      copyright: "© 2026 Unique Logic Limited | All Rights Reserved",
      modal_title: "请填写您的资料",
      modal_sub: "填妥后，我们的数码策略师将尽快为您准备免费 AI 曝光度诊断报告。",
      modal_ph_name: "名字 *",
      modal_ph_phone: "联络电话 *",
      modal_ph_email: "电邮地址 *",
      modal_ph_website: "网站网址（可选）",
      modal_submit: "领取我的免费 AI 曝光度诊断报告",
      back_btn: "返回上一页",
      ty_title: '报告正在路上！<br><span class="accent">我们已收到您的查询。</span>',
      ty_sub: "您的专属数码策略师将于一个工作天内与您联系，并为您准备免费的 AI 曝光度诊断报告。",
      ty_call: "想立即与我们对谈？请致电 <strong>+852 8400 7393</strong>",
      loc_section_title: "联络方式",
      loc_addr_label: "地址",
      loc_addr_value: "香港九龙湾启祥道 17 号<br>太丰汇 1007 室",
      loc_phone_label: "电话",
      loc_hours_label: "办公时间",
      loc_hours_value: "星期一至五　09:00 – 18:00<br>星期六、日及公众假期休息",
      loc_wechat_label: "微信",
      loc_email_label: "电邮",
      social_title: "社交平台"
    }
  };

  var STORAGE_KEY = "ul_lp_lang";
  var DEFAULT_LANG = "zh-Hant";
  var baseline = { text: {}, html: {}, ph: {} };

  function collectBaseline() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      baseline.text[el.getAttribute("data-i18n")] = el.textContent;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      baseline.html[el.getAttribute("data-i18n-html")] = el.innerHTML;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      baseline.ph[el.getAttribute("data-i18n-ph")] = el.getAttribute("placeholder") || "";
    });
  }

  function applyLang(lang) {
    var dict = lang === DEFAULT_LANG ? null : DICT[lang];

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      var v = dict && dict[k] != null ? dict[k] : baseline.text[k];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-html");
      var v = dict && dict[k] != null ? dict[k] : baseline.html[k];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      var v = dict && dict[k] != null ? dict[k] : baseline.ph[k];
      if (v != null) el.setAttribute("placeholder", v);
    });

    document.documentElement.setAttribute("lang", lang === "zh-hans" ? "zh-Hans" : lang);

    document.querySelectorAll(".lang-btn[data-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function init() {
    collectBaseline();
    var saved = DEFAULT_LANG;
    try { saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) {}
    if (saved !== DEFAULT_LANG && !DICT[saved]) saved = DEFAULT_LANG;
    applyLang(saved);

    document.querySelectorAll(".lang-btn[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-lang"));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
