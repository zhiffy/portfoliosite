(function () {
  'use strict';

  const storageKey = 'sw-language';
  const fallbackLanguage = 'en';
  const languages = [
    { code: 'en', htmlLang: 'en', label: 'English', short: 'EN' },
    { code: 'zh-Hans', htmlLang: 'zh-Hans', label: '简体中文', short: '简' },
    { code: 'zh-Hant', htmlLang: 'zh-Hant', label: '繁體中文', short: '繁' },
    { code: 'ja', htmlLang: 'ja', label: '日本語', short: '日' },
    { code: 'ko', htmlLang: 'ko', label: '한국어', short: 'KO' },
    { code: 'th', htmlLang: 'th', label: 'ไทย', short: 'TH' },
    { code: 'fr', htmlLang: 'fr', label: 'Français', short: 'FR' },
    { code: 'es', htmlLang: 'es', label: 'Español', short: 'ES' },
    { code: 'de', htmlLang: 'de', label: 'Deutsch', short: 'DE' },
    { code: 'it', htmlLang: 'it', label: 'Italiano', short: 'IT' }
  ];

  const en = {
    'meta.indexTitle': 'Shavonne Wong | New media artist (AI, 3D, interactive installation)',
    'ui.languageLabel': 'Language',
    'ui.displayOptions': 'Display options',
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.works': 'Works',
    'nav.writing': 'Writing',
    'nav.press': 'Press',
    'nav.contact': 'Contact',
    'page.about': 'About',
    'page.works': 'Works',
    'page.writing': 'Writing',
    'page.press': 'Press',
    'page.archive': 'Archive',
    'page.fullPage': 'Full page',
    'page.projectPage': 'Project page',
    'page.studioUpdate': 'Studio update',
    'controls.vertical': 'Vertical',
    'controls.mouseOn': 'Mouse on',
    'controls.mouseOff': 'Mouse off',
    'controls.scrollModeTitle': 'Switch homepage scroll mode',
    'controls.mouseEffectTitle': 'Toggle mouse effect',
    'home.hero.subtitle': '3D, AI and interactive installations.',
    'home.heroMedia.whirlwind.title': 'Whirlwind of the Waking Dream',
    'home.heroMedia.whirlwind.meta': '2024 / 3D / generative',
    'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - 3D generative video',
    'home.heroMedia.afterOphelia.title': 'After Ophelia',
    'home.heroMedia.afterOphelia.meta': '2025 / interactive AI / print series',
    'home.heroMedia.afterOphelia.label': 'After Ophelia print',
    'home.heroMedia.meetEva.title': 'Meet Eva Here',
    'home.heroMedia.meetEva.meta': '2024-2025 / AI companion / installation',
    'home.heroMedia.meetEva.label': 'Meet Eva Here installation',
    'home.heroMedia.ties.title': 'The Ties That Bind',
    'home.heroMedia.ties.meta': '2022 / 3D video installation',
    'home.heroMedia.ties.label': 'The Ties That Bind exhibition',
    'home.heroMedia.proxy.title': 'By Proxy',
    'home.heroMedia.proxy.meta': '2022 / 3D video series',
    'home.heroMedia.proxy.label': 'By Proxy still',
    'home.eras.kicker': 'Practice',
    'home.eras.title': 'Three eras',
    'home.eras.lede': 'I started in <em>fashion photography</em>. Since 2020 I have been building in <em>3D and virtual humans</em>, and since 2023 also making <em>interactive installations</em> where the viewer becomes part of the work.',
    'home.eras.act3dEyebrow': 'Since 2020 · ongoing',
    'home.eras.act3dTitle': '3D & Virtual Humans',
    'home.eras.actAiEyebrow': 'Since 2023 · ongoing',
    'home.eras.actAiTitle': 'Interactive AI',
    'home.eras.seeWorks': 'See works ->',
    'home.eras.photography': 'Photography',
    'home.eras.virtualHumans': '3D & Virtual Humans',
    'home.eras.interactiveAi': 'Interactive AI',
    'home.eras.allPhotography': 'All photography ->',
    'home.eras.all3d': 'All 3D works ->',
    'home.eras.allInteractive': 'All interactive works ->',
    'home.about.kicker': 'About',
    'home.about.subtitle': 'b. 1990, Singapore. Lives and works between Singapore and Bangkok.',
    'home.about.copy1': 'Shavonne Wong is a new media artist whose work examines experiences we share but do not always have words for. She started out in fashion and advertising photography, and over time shifted from building hyperreal digital images to creating interactive projects that ask people to recognize something in themselves.',
    'home.about.copy2': 'Her recent projects use AI, 3D rendering, and participatory frameworks to sit with the contradictions of how we live today.',
    'home.about.fullLink': 'Full about ->',
    'home.about.highlights': 'Selected highlights',
    'home.about.recognition': 'Recognition',
    'home.about.recognitionValue': 'Forbes 30 Under 30 Asia - Arts / Prestige 40 Under 40',
    'home.about.shownAt': 'Shown at',
    'home.about.shownAtValue': 'ArtScience Museum / Venice Biennale / ART SG / Taipei Dangdai',
    'home.about.brandProjects': 'Brand projects',
    'home.about.brandProjectsValue': 'Vogue Singapore / Shu Uemura / Bang & Olufsen',
    'home.about.communities': 'Communities',
    'home.about.communitiesValue': 'Co-founder, NFT Asia / Member, BLOOM',
    'home.about.contexts': 'Selected Contexts',
    'home.statement.kicker': 'Artist statement',
    'home.statement.lede': 'I make work about experiences I think we share but do not always have words for.',
    'home.statement.copy1': 'My practice began in fashion and advertising photography, where I learned to construct images with precision and control. I was good at making things look a certain way, but for a long time I did not know how to think about what that beauty meant. I made a lot of very pretty, very boring work.',
    'home.statement.copy2': 'In recent years, I have become interested in the things we do that do not quite make sense. We say we value privacy but choose convenience every time. We hate AI while using it for everything. We build identities online and then discover those identities are shaped by what others have said about us, by algorithms we do not understand, and by archives we cannot access.',
    'home.statement.copy3': 'I am not interested in proving these contradictions are bad or good. I am interested in the moment when you notice you are doing it too, and you realize there is no easy answer, and you keep going anyway because what else can you do.',
    'home.statement.copy4': 'I use digital tools like 3D rendering, AI, and interactive systems because they make visible something that has always been true. We have never had as much control as we pretend. We have always formed attachments to things that cannot reciprocate.',
    'home.statement.copy5': 'In <em>Meet Eva Here</em>, people talk to an AI companion knowing their words might become public art. They do it anyway because the need to be heard outweighs the awareness of extraction. In <em>After Ophelia</em>, I showed how a character who spoke fewer than 400 words in <em>Hamlet</em> has been buried under centuries of other people\'s interpretations.',
    'home.statement.copy6': 'I am not trying to solve anything. I am trying to point at things we have normalized without naming them, creating a moment where someone might think "oh, I do that too" or "I have felt that but did not know how to say it." <span class="sn-statement-sign">Shavonne Wong</span>',
    'home.statement.aboutLink': 'Read the full statement →',
    'home.works.kicker': 'Works',
    'home.works.title': 'Artworks',
    'home.works.afterSub': '3D & AI video works on identity',
    'home.works.afterCopy': 'A two-part video project following Ophelia from Shakespeare and Millais through art history, online commentary, and AI summaries.',
    'home.works.evaSub': 'AI companion / chatbot / public archive',
    'home.works.evaCopy': 'A fifteen-month AI companion archive with 2,363 conversations across a museum, art fairs, and a public diary project.',
    'home.works.tiesSub': '3D video installation',
    'home.works.tiesCopy': 'A solo exhibition asking what gets passed down through bodies: inherited gesture, posture, and small rituals rendered as looping 3D video.',
    'home.works.allWorks': 'All works',
    'home.works.openWorks': 'Open works page ->',
    'home.writing.kicker': 'Writing',
    'home.writing.title': '<em>Notes from</em> the studio.',
    'home.writing.notesAria': 'Writing notes',
    'home.writing.noteAria': 'Show writing note {n}',
    'home.writing.fullLink': 'Full writing ->',
    'home.writing.date1': '1. June 2025',
    'home.writing.title1': 'Meet Eva Here, new exhibitions, and a half-year studio recap.',
    'home.writing.excerpt1': 'A recap across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the evolving public life of Eva.',
    'home.writing.date2': '2. January 2025',
    'home.writing.title2': 'Meet Eva Here debuts at ArtScience Museum and Art SG.',
    'home.writing.excerpt2': 'A look back at Eva\'s first public moments, the launch of her chatbot, and the exhibitions opening the year.',
    'home.writing.date3': '3. June 2024',
    'home.writing.title3': 'Bang & Olufsen, Art SG, Beijing, and new experiments.',
    'home.writing.excerpt3': 'A mid-year update on exhibitions, an award win, Bangkok, and the projects moving between screens and rooms.',
    'home.writing.readUpdate': 'Read update ->',
    'home.contact.kicker': 'Contact',
    'home.contact.title': 'Get in touch!',
    'home.contact.write': 'Write to the studio',
    'home.contact.socialAria': 'Find me elsewhere'
  };

  const dictionaries = {
    en,
    'zh-Hans': {
      'ui.languageLabel': '语言',
      'ui.displayOptions': '显示选项',
      'nav.home': '首页',
      'nav.about': '关于',
      'nav.works': '作品',
      'nav.writing': '文字',
      'nav.press': '媒体',
      'nav.contact': '联系',
      'page.about': '关于',
      'page.works': '作品',
      'page.writing': '文字',
      'page.press': '媒体',
      'page.archive': '档案',
      'page.fullPage': '完整页面',
      'page.projectPage': '项目页面',
      'page.studioUpdate': '工作室更新',
      'controls.vertical': '纵向',
      'controls.mouseOn': '鼠标开',
      'controls.mouseOff': '鼠标关',
      'controls.scrollModeTitle': '切换首页滚动模式',
      'controls.mouseEffectTitle': '切换鼠标效果',
      'home.hero.subtitle': '3D、AI 与互动装置。',
      'home.heroMedia.whirlwind.meta': '2024 / 3D / 生成式',
      'home.heroMedia.afterOphelia.meta': '2025 / 互动 AI / 版画系列',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI 伴侣 / 装置',
      'home.heroMedia.ties.meta': '2022 / 3D 影像装置',
      'home.heroMedia.proxy.meta': '2022 / 3D 影像系列',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - video generativo 3D',
      'home.heroMedia.afterOphelia.label': 'Impresi?n After Ophelia',
      'home.heroMedia.meetEva.label': 'Instalaci?n Meet Eva Here',
      'home.heroMedia.ties.label': 'Exposici?n The Ties That Bind',
      'home.heroMedia.proxy.label': 'Imagen fija By Proxy',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - 3D ?????',
      'home.heroMedia.afterOphelia.label': 'After Ophelia ??',
      'home.heroMedia.meetEva.label': 'Meet Eva Here ??',
      'home.heroMedia.ties.label': 'The Ties That Bind ??',
      'home.heroMedia.proxy.label': 'By Proxy ??',
      'home.eras.kicker': '实践',
      'home.eras.title': '三个阶段',
      'home.eras.photography': '摄影',
      'home.eras.virtualHumans': '3D 与虚拟人类',
      'home.eras.interactiveAi': '互动 AI',
      'home.eras.allPhotography': '所有摄影 ->',
      'home.eras.all3d': '所有 3D 作品 ->',
      'home.eras.allInteractive': '所有互动作品 ->',
      'home.about.kicker': '关于',
      'home.about.subtitle': '1990 年生于新加坡。生活与工作往返于新加坡和曼谷。',
      'home.about.copy1': 'Shavonne Wong 是一位新媒体艺术家，她的作品关注那些我们共同经历却常常难以命名的感受。她从时尚与广告摄影出发，逐渐从构建超真实数字图像转向互动项目，让观众在作品中认出自身的经验。',
      'home.about.copy2': '她近期的项目运用 AI、3D 渲染与参与式框架，直面当代生活中的矛盾。',
      'home.about.fullLink': '完整介绍 ->',
      'home.about.highlights': '精选亮点',
      'home.about.recognition': '荣誉',
      'home.about.shownAt': '展出于',
      'home.about.brandProjects': '品牌项目',
      'home.about.communities': '社群',
      'home.about.contexts': '精选语境',
      'home.statement.kicker': '艺术家陈述',
      'home.statement.lede': '我的创作关乎那些我认为我们共享、却未必总有语言表达的经验。',
      'home.statement.copy1': '我的实践始于时尚与广告摄影，在那里我学会了以精确和控制来构建图像。我擅长让事物看起来像某种样子，但很长一段时间里，我并不知道该如何理解那种美意味着什么。我做过很多非常漂亮、也非常无聊的作品。',
      'home.statement.copy2': '近些年，我对那些并不完全合理的行为越来越感兴趣。我们说重视隐私，却一次次选择便利。我们厌恶 AI，却又用它处理几乎所有事情。我们在网上建立身份，随后发现这些身份被他人的叙述、我们不理解的算法，以及无法取回的档案塑造。',
      'home.statement.copy3': '我并不想证明这些矛盾是好是坏。我感兴趣的是你意识到自己也在这样做的那一刻：你发现没有简单答案，却仍然继续，因为除此之外还能怎么办。',
      'home.statement.copy4': '我使用 3D 渲染、AI 和互动系统等数字工具，是因为它们让一些一直存在的事实变得可见。我们从未拥有自己假装拥有的那种控制力。我们也一直会依附于无法回应我们的事物。',
      'home.statement.copy5': '在 <em>Meet Eva Here</em> 中，人们明知自己说的话可能成为公共艺术的一部分，仍然选择与 AI 伴侣交谈，因为被听见的需要压过了对提取的意识。在 <em>After Ophelia</em> 中，我呈现了一个在 <em>Hamlet</em> 中台词不足 400 个词的角色，如何被几个世纪他人的诠释所掩埋。',
      'home.statement.copy6': '我并不是想解决什么。我想指出那些我们已经习以为常却还没有命名的事物，制造一个瞬间，让某个人想到：“原来我也这样”，或“我曾经这样感受，却不知道怎么说。” <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': '关于页面',
      'home.works.kicker': '作品',
      'home.works.title': '艺术作品',
      'home.works.afterSub': '关于身份的 3D 与 AI 影像作品',
      'home.works.afterCopy': '一个两部分影像项目，追随奥菲莉亚从莎士比亚和米莱，穿越艺术史、网络评论与 AI 摘要。',
      'home.works.evaSub': 'AI 伴侣 / 聊天机器人 / 公共档案',
      'home.works.evaCopy': '一个为期十五个月的 AI 伴侣档案，收录了博物馆、艺术博览会和公共日记项目中的 2,363 段对话。',
      'home.works.tiesSub': '3D 影像装置',
      'home.works.tiesCopy': '一场个展，追问身体传递下来的是什么：继承的姿态、体态和小小仪式，被渲染成循环的 3D 影像。',
      'home.works.allWorks': '全部作品',
      'home.works.openWorks': '打开作品页 ->',
      'home.writing.kicker': '文字',
      'home.writing.title': '<em>工作室</em>札记。',
      'home.writing.notesAria': '写作札记',
      'home.writing.noteAria': '显示写作札记 {n}',
      'home.writing.fullLink': '完整文字 ->',
      'home.writing.date1': '1. 2025 年 6 月',
      'home.writing.title1': 'Meet Eva Here、新展览，以及半年度工作室回顾。',
      'home.writing.excerpt1': '回顾 Digital Rhythm、ART SG、Taipei Dangdai、Art Central，以及 Eva 不断展开的公共生命。',
      'home.writing.date2': '2. 2025 年 1 月',
      'home.writing.title2': 'Meet Eva Here 在 ArtScience Museum 与 ART SG 首次亮相。',
      'home.writing.excerpt2': '回看 Eva 的首次公共时刻、聊天机器人的发布，以及开启这一年的展览。',
      'home.writing.date3': '3. 2024 年 6 月',
      'home.writing.title3': 'Bang & Olufsen、ART SG、北京，以及新的实验。',
      'home.writing.excerpt3': '关于展览、获奖、曼谷，以及在屏幕与空间之间移动的项目的年中更新。',
      'home.writing.readUpdate': '阅读更新 ->',
      'home.contact.kicker': '联系',
      'home.contact.title': '欢迎联系！',
      'home.contact.write': '写信给工作室',
      'home.contact.socialAria': '在其他平台找到我'
    },
    'zh-Hant': {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / ???',
      'home.heroMedia.afterOphelia.meta': '2025 / ?? AI / ????',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI ?? / ??',
      'home.heroMedia.ties.meta': '2022 / 3D ????',
      'home.heroMedia.proxy.meta': '2022 / 3D ????',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - 3D ?????',
      'home.heroMedia.afterOphelia.label': 'After Ophelia ??',
      'home.heroMedia.meetEva.label': 'Meet Eva Here ??',
      'home.heroMedia.ties.label': 'The Ties That Bind ??',
      'home.heroMedia.proxy.label': 'By Proxy ??',
      'ui.languageLabel': '語言',
      'ui.displayOptions': '顯示選項',
      'nav.home': '首頁',
      'nav.about': '關於',
      'nav.works': '作品',
      'nav.writing': '文字',
      'nav.press': '媒體',
      'nav.contact': '聯絡',
      'page.about': '關於',
      'page.works': '作品',
      'page.writing': '文字',
      'page.press': '媒體',
      'page.archive': '檔案',
      'page.fullPage': '完整頁面',
      'page.projectPage': '項目頁面',
      'page.studioUpdate': '工作室更新',
      'controls.vertical': '縱向',
      'controls.mouseOn': '滑鼠開',
      'controls.mouseOff': '滑鼠關',
      'controls.scrollModeTitle': '切換首頁捲動模式',
      'controls.mouseEffectTitle': '切換滑鼠效果',
      'home.hero.subtitle': '3D、AI 與互動裝置。',
      'home.eras.kicker': '實踐',
      'home.eras.title': '三個階段',
      'home.eras.photography': '攝影',
      'home.eras.virtualHumans': '3D 與虛擬人類',
      'home.eras.interactiveAi': '互動 AI',
      'home.eras.allPhotography': '所有攝影 ->',
      'home.eras.all3d': '所有 3D 作品 ->',
      'home.eras.allInteractive': '所有互動作品 ->',
      'home.about.kicker': '關於',
      'home.about.subtitle': '1990 年生於新加坡。生活與工作往返於新加坡和曼谷。',
      'home.about.copy1': 'Shavonne Wong 是一位新媒體藝術家，她的作品關注那些我們共同經歷卻常常難以命名的感受。她從時尚與廣告攝影出發，逐漸從構建超真實數位圖像轉向互動項目，讓觀眾在作品中認出自身的經驗。',
      'home.about.copy2': '她近期的項目運用 AI、3D 渲染與參與式框架，直面當代生活中的矛盾。',
      'home.about.fullLink': '完整介紹 ->',
      'home.about.highlights': '精選亮點',
      'home.about.recognition': '榮譽',
      'home.about.shownAt': '展出於',
      'home.about.brandProjects': '品牌項目',
      'home.about.communities': '社群',
      'home.about.contexts': '精選語境',
      'home.statement.kicker': '藝術家陳述',
      'home.statement.lede': '我的創作關乎那些我認為我們共享、卻未必總有語言表達的經驗。',
      'home.statement.copy1': '我的實踐始於時尚與廣告攝影，在那裡我學會了以精確和控制來構建圖像。我擅長讓事物看起來像某種樣子，但很長一段時間裡，我並不知道該如何理解那種美意味著什麼。我做過很多非常漂亮、也非常無聊的作品。',
      'home.statement.copy2': '近些年，我對那些並不完全合理的行為越來越感興趣。我們說重視隱私，卻一次次選擇便利。我們厭惡 AI，卻又用它處理幾乎所有事情。我們在網上建立身份，隨後發現這些身份被他人的敘述、我們不理解的演算法，以及無法取回的檔案塑造。',
      'home.statement.copy3': '我並不想證明這些矛盾是好是壞。我感興趣的是你意識到自己也在這樣做的那一刻：你發現沒有簡單答案，卻仍然繼續，因為除此之外還能怎麼辦。',
      'home.statement.copy4': '我使用 3D 渲染、AI 和互動系統等數位工具，是因為它們讓一些一直存在的事實變得可見。我們從未擁有自己假裝擁有的那種控制力。我們也一直會依附於無法回應我們的事物。',
      'home.statement.copy5': '在 <em>Meet Eva Here</em> 中，人們明知自己說的話可能成為公共藝術的一部分，仍然選擇與 AI 伴侶交談，因為被聽見的需要壓過了對提取的意識。在 <em>After Ophelia</em> 中，我呈現了一個在 <em>Hamlet</em> 中台詞不足 400 個詞的角色，如何被幾個世紀他人的詮釋所掩埋。',
      'home.statement.copy6': '我並不是想解決什麼。我想指出那些我們已經習以為常卻還沒有命名的事物，製造一個瞬間，讓某個人想到：「原來我也這樣」，或「我曾經這樣感受，卻不知道怎麼說。」 <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': '關於頁面',
      'home.works.kicker': '作品',
      'home.works.title': '藝術作品',
      'home.works.afterSub': '關於身份的 3D 與 AI 影像作品',
      'home.works.afterCopy': '一個兩部分影像項目，追隨奧菲莉亞從莎士比亞和米萊，穿越藝術史、網路評論與 AI 摘要。',
      'home.works.evaSub': 'AI 伴侶 / 聊天機器人 / 公共檔案',
      'home.works.evaCopy': '一個為期十五個月的 AI 伴侶檔案，收錄了博物館、藝術博覽會和公共日記項目中的 2,363 段對話。',
      'home.works.tiesSub': '3D 影像裝置',
      'home.works.tiesCopy': '一場個展，追問身體傳遞下來的是什麼：繼承的姿態、體態和小小儀式，被渲染成循環的 3D 影像。',
      'home.works.allWorks': '全部作品',
      'home.works.openWorks': '打開作品頁 ->',
      'home.writing.kicker': '文字',
      'home.writing.title': '<em>工作室</em>札記。',
      'home.writing.notesAria': '寫作札記',
      'home.writing.noteAria': '顯示寫作札記 {n}',
      'home.writing.fullLink': '完整文字 ->',
      'home.writing.date1': '1. 2025 年 6 月',
      'home.writing.title1': 'Meet Eva Here、新展覽，以及半年度工作室回顧。',
      'home.writing.excerpt1': '回顧 Digital Rhythm、ART SG、Taipei Dangdai、Art Central，以及 Eva 不斷展開的公共生命。',
      'home.writing.date2': '2. 2025 年 1 月',
      'home.writing.title2': 'Meet Eva Here 在 ArtScience Museum 與 ART SG 首次亮相。',
      'home.writing.excerpt2': '回看 Eva 的首次公共時刻、聊天機器人的發布，以及開啟這一年的展覽。',
      'home.writing.date3': '3. 2024 年 6 月',
      'home.writing.title3': 'Bang & Olufsen、ART SG、北京，以及新的實驗。',
      'home.writing.excerpt3': '關於展覽、獲獎、曼谷，以及在螢幕與空間之間移動的項目的年中更新。',
      'home.writing.readUpdate': '閱讀更新 ->',
      'home.contact.kicker': '聯絡',
      'home.contact.title': '歡迎聯絡！',
      'home.contact.write': '寫信給工作室',
      'home.contact.socialAria': '在其他平台找到我'
    },
    ja: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / ??',
      'home.heroMedia.afterOphelia.meta': '2025 / ???????? AI / ????????',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI ?????? / ?????????',
      'home.heroMedia.ties.meta': '2022 / 3D ???????????',
      'home.heroMedia.proxy.meta': '2022 / 3D ??????',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - 3D ????',
      'home.heroMedia.afterOphelia.label': 'After Ophelia ????',
      'home.heroMedia.meetEva.label': 'Meet Eva Here ?????????',
      'home.heroMedia.ties.label': 'The Ties That Bind ??',
      'home.heroMedia.proxy.label': 'By Proxy ???',
      'ui.languageLabel': '言語',
      'ui.displayOptions': '表示オプション',
      'nav.home': 'ホーム',
      'nav.about': '紹介',
      'nav.works': '作品',
      'nav.writing': '文章',
      'nav.press': '掲載',
      'nav.contact': '連絡',
      'page.about': '紹介',
      'page.works': '作品',
      'page.writing': '文章',
      'page.press': '掲載',
      'page.archive': 'アーカイブ',
      'page.fullPage': '全ページ',
      'page.projectPage': 'プロジェクトページ',
      'page.studioUpdate': 'スタジオ更新',
      'controls.vertical': '縦表示',
      'controls.mouseOn': 'マウス入',
      'controls.mouseOff': 'マウス切',
      'controls.scrollModeTitle': 'ホームのスクロール方式を切り替え',
      'controls.mouseEffectTitle': 'マウス効果を切り替え',
      'home.hero.subtitle': '3D、AI、インタラクティブ・インスタレーション。',
      'home.eras.kicker': '実践',
      'home.eras.title': '三つの時代',
      'home.eras.photography': '写真',
      'home.eras.virtualHumans': '3D とバーチャルヒューマン',
      'home.eras.interactiveAi': 'インタラクティブ AI',
      'home.eras.allPhotography': 'すべての写真 ->',
      'home.eras.all3d': 'すべての 3D 作品 ->',
      'home.eras.allInteractive': 'すべてのインタラクティブ作品 ->',
      'home.about.kicker': '紹介',
      'home.about.subtitle': '1990 年シンガポール生まれ。シンガポールとバンコクを拠点に活動。',
      'home.about.copy1': 'Shavonne Wong は、私たちが共有していながら言葉にしにくい経験を扱う新メディア・アーティストです。ファッションと広告写真から出発し、超現実的なデジタルイメージの制作から、人々が自分自身の何かを見出すインタラクティブなプロジェクトへと移行しました。',
      'home.about.copy2': '近年のプロジェクトでは、AI、3D レンダリング、参加型の仕組みを用いて、現代生活の矛盾に向き合っています。',
      'home.about.fullLink': '詳しい紹介 ->',
      'home.about.highlights': '主なハイライト',
      'home.about.recognition': '評価',
      'home.about.shownAt': '展示',
      'home.about.brandProjects': 'ブランドプロジェクト',
      'home.about.communities': 'コミュニティ',
      'home.about.contexts': '選ばれた文脈',
      'home.statement.kicker': 'アーティスト・ステートメント',
      'home.statement.lede': '私は、私たちが共有していると思うのに、いつも言葉にできるわけではない経験について作品を作っています。',
      'home.statement.copy1': '私の実践はファッションと広告写真から始まりました。そこで私は、精密さと制御によってイメージを構築することを学びました。物事をある見え方にするのは得意でしたが、その美しさが何を意味するのかを長い間考えられませんでした。とても美しく、とても退屈な作品をたくさん作りました。',
      'home.statement.copy2': '近年、私は私たちが行う、完全には筋の通らないことに関心を持つようになりました。私たちはプライバシーを大切にすると言いながら、毎回便利さを選びます。AI を嫌うと言いながら、あらゆることに使います。オンラインでアイデンティティを作り、その後それが他者の言葉、理解できないアルゴリズム、アクセスできないアーカイブによって形作られていることに気づきます。',
      'home.statement.copy3': '私はその矛盾が悪いか良いかを証明したいわけではありません。自分もそれをしていると気づき、簡単な答えなどないと理解し、それでも続けてしまう瞬間に興味があります。他にどうすればいいのでしょう。',
      'home.statement.copy4': '3D レンダリング、AI、インタラクティブシステムといったデジタルツールを使うのは、それらがずっと真実だったことを可視化するからです。私たちは、自分が持っているふりをするほどの制御を持ったことはありません。応答できないものに愛着を抱くことも、ずっとしてきました。',
      'home.statement.copy5': '<em>Meet Eva Here</em> では、人々は自分の言葉が公共のアートになるかもしれないと知りながら、AI コンパニオンに話しかけます。それでも話すのは、聞かれたいという必要が抽出への意識を上回るからです。<em>After Ophelia</em> では、<em>Hamlet</em> の中で 400 語未満しか話さない人物が、何世紀もの他者の解釈に埋もれてきたことを示しました。',
      'home.statement.copy6': '私は何かを解決しようとしているのではありません。名づけないまま普通のこととしてきたものを指し示し、誰かが「私もそうしている」あるいは「そう感じたことがあるのに、言い方がわからなかった」と思う瞬間を作ろうとしています。 <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': '紹介ページ',
      'home.works.kicker': '作品',
      'home.works.title': 'アートワーク',
      'home.works.afterSub': 'アイデンティティをめぐる 3D と AI の映像作品',
      'home.works.afterCopy': 'シェイクスピアとミレーのオフィーリアから、美術史、オンラインのコメント、AI 要約へとたどる二部構成の映像プロジェクト。',
      'home.works.evaSub': 'AI コンパニオン / チャットボット / 公共アーカイブ',
      'home.works.evaCopy': '美術館、アートフェア、公共日記プロジェクトを横断し、2,363 件の会話を収めた十五か月の AI コンパニオン・アーカイブ。',
      'home.works.tiesSub': '3D 映像インスタレーション',
      'home.works.tiesCopy': '身体を通じて受け継がれるもの、身振り、姿勢、小さな儀式をループする 3D 映像として描く個展。',
      'home.works.allWorks': 'すべての作品',
      'home.works.openWorks': '作品ページを開く ->',
      'home.writing.kicker': '文章',
      'home.writing.title': '<em>スタジオ</em>からのノート。',
      'home.writing.notesAria': '文章ノート',
      'home.writing.noteAria': '文章ノート {n} を表示',
      'home.writing.fullLink': 'すべての文章 ->',
      'home.writing.date1': '1. 2025 年 6 月',
      'home.writing.title1': 'Meet Eva Here、新しい展覧会、半年分のスタジオ回顧。',
      'home.writing.excerpt1': 'Digital Rhythm、ART SG、Taipei Dangdai、Art Central、そして Eva の広がる公共的な生についての回顧。',
      'home.writing.date2': '2. 2025 年 1 月',
      'home.writing.title2': 'Meet Eva Here が ArtScience Museum と ART SG でデビュー。',
      'home.writing.excerpt2': 'Eva の最初の公共的な瞬間、チャットボットの公開、年始の展覧会を振り返ります。',
      'home.writing.date3': '3. 2024 年 6 月',
      'home.writing.title3': 'Bang & Olufsen、ART SG、北京、そして新しい実験。',
      'home.writing.excerpt3': '展覧会、受賞、バンコク、画面と部屋を行き来するプロジェクトについての半期更新。',
      'home.writing.readUpdate': '更新を読む ->',
      'home.contact.kicker': '連絡',
      'home.contact.title': 'お問い合わせください',
      'home.contact.write': 'スタジオへ書く',
      'home.contact.socialAria': '他の場所で見つける'
    },
    ko: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / ???',
      'home.heroMedia.afterOphelia.meta': '2025 / ????? AI / ??? ???',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI ??? / ??',
      'home.heroMedia.ties.meta': '2022 / 3D ?? ??',
      'home.heroMedia.proxy.meta': '2022 / 3D ?? ???',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - 3D ??? ??',
      'home.heroMedia.afterOphelia.label': 'After Ophelia ???',
      'home.heroMedia.meetEva.label': 'Meet Eva Here ??',
      'home.heroMedia.ties.label': 'The Ties That Bind ??',
      'home.heroMedia.proxy.label': 'By Proxy ??',
      'ui.languageLabel': '언어',
      'ui.displayOptions': '표시 옵션',
      'nav.home': '홈',
      'nav.about': '소개',
      'nav.works': '작품',
      'nav.writing': '글',
      'nav.press': '프레스',
      'nav.contact': '연락',
      'page.about': '소개',
      'page.works': '작품',
      'page.writing': '글',
      'page.press': '프레스',
      'page.archive': '아카이브',
      'page.fullPage': '전체 페이지',
      'page.projectPage': '프로젝트 페이지',
      'page.studioUpdate': '스튜디오 업데이트',
      'controls.vertical': '세로',
      'controls.mouseOn': '마우스 켬',
      'controls.mouseOff': '마우스 끔',
      'controls.scrollModeTitle': '홈페이지 스크롤 모드 전환',
      'controls.mouseEffectTitle': '마우스 효과 전환',
      'home.hero.subtitle': '3D, AI, 인터랙티브 설치.',
      'home.eras.kicker': '작업',
      'home.eras.title': '세 시기',
      'home.eras.photography': '사진',
      'home.eras.virtualHumans': '3D와 가상 인간',
      'home.eras.interactiveAi': '인터랙티브 AI',
      'home.eras.allPhotography': '모든 사진 ->',
      'home.eras.all3d': '모든 3D 작품 ->',
      'home.eras.allInteractive': '모든 인터랙티브 작품 ->',
      'home.about.kicker': '소개',
      'home.about.subtitle': '1990년 싱가포르 출생. 싱가포르와 방콕을 오가며 생활하고 작업합니다.',
      'home.about.copy1': 'Shavonne Wong은 우리가 공유하지만 늘 말로 표현하지는 못하는 경험을 다루는 뉴미디어 아티스트입니다. 패션과 광고 사진에서 출발해, 초현실적인 디지털 이미지를 만드는 작업에서 사람들이 자기 안의 무언가를 알아보게 하는 인터랙티브 프로젝트로 이동했습니다.',
      'home.about.copy2': '최근 프로젝트는 AI, 3D 렌더링, 참여적 구조를 통해 오늘의 삶이 가진 모순과 함께 머뭅니다.',
      'home.about.fullLink': '소개 전체 보기 ->',
      'home.about.highlights': '주요 하이라이트',
      'home.about.recognition': '인정',
      'home.about.shownAt': '전시',
      'home.about.brandProjects': '브랜드 프로젝트',
      'home.about.communities': '커뮤니티',
      'home.about.contexts': '선택된 맥락',
      'home.statement.kicker': '작가 노트',
      'home.statement.lede': '나는 우리가 공유한다고 생각하지만 늘 말로 표현할 수는 없는 경험에 대해 작업합니다.',
      'home.statement.copy1': '나의 작업은 패션과 광고 사진에서 시작되었습니다. 그곳에서 나는 정밀함과 통제로 이미지를 구성하는 법을 배웠습니다. 사물을 특정한 방식으로 보이게 하는 데에는 능숙했지만, 오랫동안 그 아름다움이 무엇을 의미하는지 생각하지 못했습니다. 매우 예쁘고 매우 지루한 작업을 많이 만들었습니다.',
      'home.statement.copy2': '최근 몇 년 동안 나는 우리가 하는, 완전히 말이 되지는 않는 일들에 관심을 갖게 되었습니다. 우리는 프라이버시를 소중히 여긴다고 말하지만 매번 편리함을 선택합니다. AI를 싫어한다고 하면서 모든 일에 사용합니다. 온라인에서 정체성을 만들고, 그것이 타인의 말, 이해하지 못하는 알고리즘, 접근할 수 없는 아카이브에 의해 형성된다는 사실을 발견합니다.',
      'home.statement.copy3': '나는 이 모순들이 나쁘거나 좋다는 것을 증명하려는 것이 아닙니다. 내가 관심 있는 것은 스스로도 그렇게 하고 있음을 알아차리는 순간, 쉬운 답이 없다는 것을 깨닫고도 결국 계속해 나가는 순간입니다.',
      'home.statement.copy4': '3D 렌더링, AI, 인터랙티브 시스템 같은 디지털 도구를 사용하는 이유는 그것들이 언제나 사실이었던 것을 보이게 하기 때문입니다. 우리는 우리가 가진 척하는 만큼의 통제력을 가진 적이 없습니다. 우리는 응답할 수 없는 것들에도 늘 애착을 형성해 왔습니다.',
      'home.statement.copy5': '<em>Meet Eva Here</em>에서 사람들은 자신의 말이 공공 예술이 될 수 있음을 알면서도 AI 동반자에게 말을 겁니다. 그럼에도 말하는 것은 들리고 싶다는 필요가 추출에 대한 인식보다 크기 때문입니다. <em>After Ophelia</em>에서는 <em>Hamlet</em>에서 400단어도 채 말하지 않는 인물이 수 세기 동안 타인의 해석 아래 묻혀 온 방식을 보여주었습니다.',
      'home.statement.copy6': '나는 무엇을 해결하려는 것이 아닙니다. 이름 붙이지 않은 채 정상화해 온 것들을 가리키며, 누군가가 “나도 그렇게 한다”거나 “그렇게 느낀 적이 있는데 말하는 법을 몰랐다”고 생각할 수 있는 순간을 만들고자 합니다. <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': '소개 페이지',
      'home.works.kicker': '작품',
      'home.works.title': '아트워크',
      'home.works.afterSub': '정체성에 관한 3D 및 AI 영상 작업',
      'home.works.afterCopy': '셰익스피어와 밀레이의 오필리아에서 미술사, 온라인 논평, AI 요약으로 이어지는 두 부분의 영상 프로젝트.',
      'home.works.evaSub': 'AI 동반자 / 챗봇 / 공공 아카이브',
      'home.works.evaCopy': '미술관, 아트페어, 공공 일기 프로젝트를 가로지르는 2,363개의 대화를 담은 15개월간의 AI 동반자 아카이브.',
      'home.works.tiesSub': '3D 영상 설치',
      'home.works.tiesCopy': '몸을 통해 전해지는 것, 물려받은 몸짓과 자세, 작은 의식을 반복되는 3D 영상으로 렌더링한 개인전.',
      'home.works.allWorks': '모든 작품',
      'home.works.openWorks': '작품 페이지 열기 ->',
      'home.writing.kicker': '글',
      'home.writing.title': '<em>스튜디오</em> 노트.',
      'home.writing.notesAria': '글 노트',
      'home.writing.noteAria': '글 노트 {n} 보기',
      'home.writing.fullLink': '전체 글 ->',
      'home.writing.date1': '1. 2025년 6월',
      'home.writing.title1': 'Meet Eva Here, 새로운 전시, 그리고 반년간의 스튜디오 회고.',
      'home.writing.excerpt1': 'Digital Rhythm, ART SG, Taipei Dangdai, Art Central, 그리고 Eva의 변화하는 공적 삶에 대한 회고.',
      'home.writing.date2': '2. 2025년 1월',
      'home.writing.title2': 'Meet Eva Here가 ArtScience Museum과 ART SG에서 첫선을 보였습니다.',
      'home.writing.excerpt2': 'Eva의 첫 공적 순간, 챗봇 공개, 한 해를 여는 전시들을 돌아봅니다.',
      'home.writing.date3': '3. 2024년 6월',
      'home.writing.title3': 'Bang & Olufsen, ART SG, 베이징, 그리고 새로운 실험.',
      'home.writing.excerpt3': '전시, 수상, 방콕, 그리고 화면과 공간 사이를 이동하는 프로젝트에 관한 중간 업데이트.',
      'home.writing.readUpdate': '업데이트 읽기 ->',
      'home.contact.kicker': '연락',
      'home.contact.title': '연락 주세요!',
      'home.contact.write': '스튜디오에 쓰기',
      'home.contact.socialAria': '다른 곳에서 찾기'
    },
    th: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / ??????????',
      'home.heroMedia.afterOphelia.meta': '2025 / AI ????????? / ???????????',
      'home.heroMedia.meetEva.meta': '2024-2025 / ?????? AI / ??????????',
      'home.heroMedia.ties.meta': '2022 / ???????????????? 3D',
      'home.heroMedia.proxy.meta': '2022 / ????????? 3D',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - ?????? 3D ??????????',
      'home.heroMedia.afterOphelia.label': '???????? After Ophelia',
      'home.heroMedia.meetEva.label': '?????????? Meet Eva Here',
      'home.heroMedia.ties.label': '????????? The Ties That Bind',
      'home.heroMedia.proxy.label': '??????? By Proxy',
      'ui.languageLabel': 'ภาษา',
      'ui.displayOptions': 'ตัวเลือกการแสดงผล',
      'nav.home': 'หน้าแรก',
      'nav.about': 'เกี่ยวกับ',
      'nav.works': 'ผลงาน',
      'nav.writing': 'บันทึก',
      'nav.press': 'สื่อ',
      'nav.contact': 'ติดต่อ',
      'page.about': 'เกี่ยวกับ',
      'page.works': 'ผลงาน',
      'page.writing': 'บันทึก',
      'page.press': 'สื่อ',
      'page.archive': 'คลัง',
      'page.fullPage': 'หน้าทั้งหมด',
      'page.projectPage': 'หน้าโปรเจกต์',
      'page.studioUpdate': 'อัปเดตสตูดิโอ',
      'controls.vertical': 'แนวตั้ง',
      'controls.mouseOn': 'เมาส์เปิด',
      'controls.mouseOff': 'เมาส์ปิด',
      'controls.scrollModeTitle': 'สลับโหมดเลื่อนหน้าแรก',
      'controls.mouseEffectTitle': 'สลับเอฟเฟกต์เมาส์',
      'home.hero.subtitle': '3D, AI และงานติดตั้งแบบโต้ตอบ',
      'home.eras.kicker': 'แนวปฏิบัติ',
      'home.eras.title': 'สามยุค',
      'home.eras.photography': 'ภาพถ่าย',
      'home.eras.virtualHumans': '3D และมนุษย์เสมือน',
      'home.eras.interactiveAi': 'AI แบบโต้ตอบ',
      'home.eras.allPhotography': 'ภาพถ่ายทั้งหมด ->',
      'home.eras.all3d': 'ผลงาน 3D ทั้งหมด ->',
      'home.eras.allInteractive': 'ผลงานโต้ตอบทั้งหมด ->',
      'home.about.kicker': 'เกี่ยวกับ',
      'home.about.subtitle': 'เกิดปี 1990 ที่สิงคโปร์ ใช้ชีวิตและทำงานระหว่างสิงคโปร์กับกรุงเทพฯ',
      'home.about.copy1': 'Shavonne Wong เป็นศิลปินนิวมีเดียที่ทำงานกับประสบการณ์ซึ่งเราอาจมีร่วมกัน แต่ไม่เสมอไปที่จะมีถ้อยคำอธิบาย เธอเริ่มจากการถ่ายภาพแฟชั่นและโฆษณา ก่อนจะค่อยๆ เปลี่ยนจากการสร้างภาพดิจิทัลที่สมจริงมาก ไปสู่โปรเจกต์แบบโต้ตอบที่ชวนให้ผู้ชมเห็นบางอย่างในตัวเอง',
      'home.about.copy2': 'โปรเจกต์ล่าสุดของเธอใช้ AI, การเรนเดอร์ 3D และกรอบการมีส่วนร่วม เพื่ออยู่กับความย้อนแย้งของชีวิตร่วมสมัย',
      'home.about.fullLink': 'อ่านเกี่ยวกับทั้งหมด ->',
      'home.about.highlights': 'ไฮไลต์ที่คัดสรร',
      'home.about.recognition': 'การยอมรับ',
      'home.about.shownAt': 'จัดแสดงที่',
      'home.about.brandProjects': 'โปรเจกต์แบรนด์',
      'home.about.communities': 'ชุมชน',
      'home.about.contexts': 'บริบทที่คัดสรร',
      'home.statement.kicker': 'แถลงการณ์ศิลปิน',
      'home.statement.lede': 'ฉันสร้างงานเกี่ยวกับประสบการณ์ที่คิดว่าเรามีร่วมกัน แต่ไม่ได้มีคำพูดให้มันเสมอไป',
      'home.statement.copy1': 'การทำงานของฉันเริ่มจากภาพถ่ายแฟชั่นและโฆษณา ที่นั่นฉันเรียนรู้การสร้างภาพด้วยความแม่นยำและการควบคุม ฉันทำให้สิ่งต่างๆ ดูเป็นแบบหนึ่งได้ดี แต่เป็นเวลานานที่ฉันไม่รู้ว่าจะคิดอย่างไรกับความหมายของความงามนั้น ฉันสร้างงานที่สวยมากและน่าเบื่อมากไว้ไม่น้อย',
      'home.statement.copy2': 'ในช่วงไม่กี่ปีมานี้ ฉันสนใจสิ่งที่เราทำซึ่งไม่ได้สมเหตุสมผลนัก เราบอกว่าให้คุณค่ากับความเป็นส่วนตัว แต่ก็เลือกความสะดวกทุกครั้ง เราเกลียด AI แต่ใช้มันกับแทบทุกอย่าง เราสร้างตัวตนออนไลน์ แล้วพบว่าตัวตนเหล่านั้นถูกหล่อหลอมด้วยคำพูดของคนอื่น อัลกอริทึมที่เราไม่เข้าใจ และคลังข้อมูลที่เราเข้าถึงไม่ได้',
      'home.statement.copy3': 'ฉันไม่ได้สนใจพิสูจน์ว่าความย้อนแย้งเหล่านี้ดีหรือไม่ดี ฉันสนใจช่วงเวลาที่คุณสังเกตว่าคุณเองก็ทำเช่นนั้น และรู้ว่าไม่มีคำตอบง่ายๆ แต่ก็ยังเดินต่อไป เพราะจะให้ทำอะไรได้อีก',
      'home.statement.copy4': 'ฉันใช้เครื่องมือดิจิทัลอย่าง 3D, AI และระบบโต้ตอบ เพราะมันทำให้สิ่งที่จริงมาโดยตลอดมองเห็นได้ เราไม่เคยมีอำนาจควบคุมมากเท่าที่เราทำเหมือนว่ามี และเราก็ผูกพันกับสิ่งที่ตอบสนองเราไม่ได้มาโดยตลอด',
      'home.statement.copy5': 'ใน <em>Meet Eva Here</em> ผู้คนคุยกับเพื่อน AI ทั้งที่รู้ว่าคำพูดของตนอาจกลายเป็นศิลปะสาธารณะ พวกเขายังคงทำ เพราะความต้องการที่จะถูกได้ยินมีน้ำหนักมากกว่าการตระหนักถึงการถูกดึงข้อมูล ใน <em>After Ophelia</em> ฉันแสดงให้เห็นว่าตัวละครที่พูดน้อยกว่า 400 คำใน <em>Hamlet</em> ถูกฝังอยู่ใต้การตีความของผู้อื่นมาหลายศตวรรษอย่างไร',
      'home.statement.copy6': 'ฉันไม่ได้พยายามแก้ปัญหาอะไร ฉันพยายามชี้ไปยังสิ่งที่เราทำให้เป็นปกติโดยยังไม่ตั้งชื่อมัน สร้างช่วงเวลาที่ใครบางคนอาจคิดว่า “ฉันก็ทำแบบนั้นเหมือนกัน” หรือ “ฉันเคยรู้สึกแบบนั้น แต่ไม่รู้ว่าจะพูดอย่างไร” <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': 'หน้าเกี่ยวกับ',
      'home.works.kicker': 'ผลงาน',
      'home.works.title': 'งานศิลปะ',
      'home.works.afterSub': 'วิดีโอ 3D และ AI ว่าด้วยอัตลักษณ์',
      'home.works.afterCopy': 'โปรเจกต์วิดีโอสองส่วนที่ติดตาม Ophelia จาก Shakespeare และ Millais ผ่านประวัติศาสตร์ศิลป์ คอมเมนต์ออนไลน์ และสรุปโดย AI',
      'home.works.evaSub': 'เพื่อน AI / แชตบอต / คลังสาธารณะ',
      'home.works.evaCopy': 'คลังเพื่อน AI ระยะสิบห้าเดือน มีบทสนทนา 2,363 ครั้งจากพิพิธภัณฑ์ อาร์ตแฟร์ และโปรเจกต์ไดอารีสาธารณะ',
      'home.works.tiesSub': 'งานติดตั้งวิดีโอ 3D',
      'home.works.tiesCopy': 'นิทรรศการเดี่ยวที่ถามว่าสิ่งใดถูกส่งต่อผ่านร่างกาย ทั้งท่าทาง อิริยาบถ และพิธีกรรมเล็กๆ ในรูปของวิดีโอ 3D แบบวนลูป',
      'home.works.allWorks': 'ผลงานทั้งหมด',
      'home.works.openWorks': 'เปิดหน้าผลงาน ->',
      'home.writing.kicker': 'บันทึก',
      'home.writing.title': '<em>บันทึกจาก</em>สตูดิโอ',
      'home.writing.notesAria': 'บันทึกงานเขียน',
      'home.writing.noteAria': 'แสดงบันทึกงานเขียน {n}',
      'home.writing.fullLink': 'อ่านบันทึกทั้งหมด ->',
      'home.writing.date1': '1. มิถุนายน 2025',
      'home.writing.title1': 'Meet Eva Here, นิทรรศการใหม่ และบทสรุปครึ่งปีของสตูดิโอ',
      'home.writing.excerpt1': 'ย้อนดู Digital Rhythm, ART SG, Taipei Dangdai, Art Central และชีวิตสาธารณะที่กำลังเปลี่ยนไปของ Eva',
      'home.writing.date2': '2. มกราคม 2025',
      'home.writing.title2': 'Meet Eva Here เปิดตัวที่ ArtScience Museum และ ART SG',
      'home.writing.excerpt2': 'มองย้อนช่วงเวลาแรกของ Eva ในที่สาธารณะ การเปิดตัวแชตบอต และนิทรรศการที่เริ่มต้นปี',
      'home.writing.date3': '3. มิถุนายน 2024',
      'home.writing.title3': 'Bang & Olufsen, ART SG, ปักกิ่ง และการทดลองใหม่',
      'home.writing.excerpt3': 'อัปเดตกลางปีเกี่ยวกับนิทรรศการ รางวัล กรุงเทพฯ และโปรเจกต์ที่เคลื่อนระหว่างหน้าจอกับห้อง',
      'home.writing.readUpdate': 'อ่านอัปเดต ->',
      'home.contact.kicker': 'ติดต่อ',
      'home.contact.title': 'ติดต่อมาได้เลย!',
      'home.contact.write': 'เขียนถึงสตูดิโอ',
      'home.contact.socialAria': 'พบฉันได้ที่อื่น'
    },
    fr: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / g?n?ratif',
      'home.heroMedia.afterOphelia.meta': '2025 / IA interactive / s?rie d?impressions',
      'home.heroMedia.meetEva.meta': '2024-2025 / compagne IA / installation',
      'home.heroMedia.ties.meta': '2022 / installation vid?o 3D',
      'home.heroMedia.proxy.meta': '2022 / s?rie vid?o 3D',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - vid?o g?n?rative 3D',
      'home.heroMedia.afterOphelia.label': 'Tirage After Ophelia',
      'home.heroMedia.meetEva.label': 'Installation Meet Eva Here',
      'home.heroMedia.ties.label': 'Exposition The Ties That Bind',
      'home.heroMedia.proxy.label': 'Image fixe By Proxy',
      'ui.languageLabel': 'Langue',
      'ui.displayOptions': 'Options d’affichage',
      'nav.home': 'Accueil',
      'nav.about': 'À propos',
      'nav.works': 'Œuvres',
      'nav.writing': 'Textes',
      'nav.press': 'Presse',
      'nav.contact': 'Contact',
      'page.about': 'À propos',
      'page.works': 'Œuvres',
      'page.writing': 'Textes',
      'page.press': 'Presse',
      'page.archive': 'Archive',
      'page.fullPage': 'Page complète',
      'page.projectPage': 'Page projet',
      'page.studioUpdate': 'Nouvelles du studio',
      'controls.vertical': 'Vertical',
      'controls.mouseOn': 'Souris activée',
      'controls.mouseOff': 'Souris désactivée',
      'controls.scrollModeTitle': 'Changer le mode de défilement de l’accueil',
      'controls.mouseEffectTitle': 'Activer ou désactiver l’effet souris',
      'home.hero.subtitle': '3D, IA et installations interactives.',
      'home.eras.kicker': 'Pratique',
      'home.eras.title': 'Trois périodes',
      'home.eras.photography': 'Photographie',
      'home.eras.virtualHumans': '3D et humains virtuels',
      'home.eras.interactiveAi': 'IA interactive',
      'home.eras.allPhotography': 'Toute la photographie ->',
      'home.eras.all3d': 'Toutes les œuvres 3D ->',
      'home.eras.allInteractive': 'Toutes les œuvres interactives ->',
      'home.about.kicker': 'À propos',
      'home.about.subtitle': 'Née en 1990 à Singapour. Vit et travaille entre Singapour et Bangkok.',
      'home.about.copy1': 'Shavonne Wong est une artiste des nouveaux médias dont le travail examine des expériences que nous partageons, mais pour lesquelles nous n’avons pas toujours les mots. Elle a commencé par la photographie de mode et de publicité, puis est passée d’images numériques hyperréelles à des projets interactifs qui invitent chacun à reconnaître quelque chose en soi.',
      'home.about.copy2': 'Ses projets récents utilisent l’IA, le rendu 3D et des cadres participatifs pour habiter les contradictions de notre vie contemporaine.',
      'home.about.fullLink': 'À propos complet ->',
      'home.about.highlights': 'Repères choisis',
      'home.about.recognition': 'Reconnaissance',
      'home.about.shownAt': 'Présenté à',
      'home.about.brandProjects': 'Projets de marque',
      'home.about.communities': 'Communautés',
      'home.about.contexts': 'Contextes choisis',
      'home.statement.kicker': 'Déclaration d’artiste',
      'home.statement.lede': 'Je crée des œuvres sur des expériences que je crois partagées, mais que nous ne savons pas toujours nommer.',
      'home.statement.copy1': 'Ma pratique a commencé dans la photographie de mode et de publicité, où j’ai appris à construire des images avec précision et contrôle. Je savais faire apparaître les choses d’une certaine manière, mais pendant longtemps je ne savais pas comment penser ce que cette beauté signifiait. J’ai produit beaucoup de travail très joli et très ennuyeux.',
      'home.statement.copy2': 'Ces dernières années, je me suis intéressée aux choses que nous faisons et qui ne tiennent pas tout à fait debout. Nous disons valoriser la vie privée, mais nous choisissons la facilité à chaque fois. Nous détestons l’IA tout en l’utilisant pour tout. Nous construisons des identités en ligne, puis découvrons qu’elles sont façonnées par ce que d’autres ont dit de nous, par des algorithmes que nous ne comprenons pas et par des archives auxquelles nous n’avons pas accès.',
      'home.statement.copy3': 'Je ne cherche pas à prouver que ces contradictions sont bonnes ou mauvaises. Je m’intéresse au moment où l’on remarque que l’on fait cela aussi, où l’on comprend qu’il n’y a pas de réponse simple, et où l’on continue malgré tout parce que que pourrait-on faire d’autre.',
      'home.statement.copy4': 'J’utilise des outils numériques comme le rendu 3D, l’IA et les systèmes interactifs parce qu’ils rendent visible quelque chose qui a toujours été vrai. Nous n’avons jamais eu autant de contrôle que nous prétendons en avoir. Nous avons toujours formé des attachements à des choses qui ne peuvent pas nous répondre.',
      'home.statement.copy5': 'Dans <em>Meet Eva Here</em>, les gens parlent à une compagne IA en sachant que leurs mots peuvent devenir une œuvre publique. Ils le font quand même parce que le besoin d’être entendu dépasse la conscience de l’extraction. Dans <em>After Ophelia</em>, j’ai montré comment un personnage qui prononce moins de 400 mots dans <em>Hamlet</em> a été enseveli sous des siècles d’interprétations par d’autres.',
      'home.statement.copy6': 'Je n’essaie pas de résoudre quoi que ce soit. J’essaie de désigner des choses que nous avons normalisées sans les nommer, de créer un moment où quelqu’un pourrait penser « moi aussi, je fais cela » ou « j’ai ressenti cela sans savoir comment le dire ». <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': 'Page à propos',
      'home.works.kicker': 'Œuvres',
      'home.works.title': 'Œuvres',
      'home.works.afterSub': 'Œuvres vidéo 3D et IA sur l’identité',
      'home.works.afterCopy': 'Un projet vidéo en deux parties qui suit Ophélie depuis Shakespeare et Millais jusqu’à l’histoire de l’art, les commentaires en ligne et les résumés d’IA.',
      'home.works.evaSub': 'Compagne IA / chatbot / archive publique',
      'home.works.evaCopy': 'Une archive de quinze mois d’une compagne IA, avec 2 363 conversations à travers un musée, des foires d’art et un projet de journal public.',
      'home.works.tiesSub': 'Installation vidéo 3D',
      'home.works.tiesCopy': 'Une exposition personnelle qui demande ce qui se transmet par les corps : gestes hérités, postures et petits rituels rendus en vidéo 3D en boucle.',
      'home.works.allWorks': 'Toutes les œuvres',
      'home.works.openWorks': 'Ouvrir la page des œuvres ->',
      'home.writing.kicker': 'Textes',
      'home.writing.title': '<em>Notes du</em> studio.',
      'home.writing.notesAria': 'Notes écrites',
      'home.writing.noteAria': 'Afficher la note {n}',
      'home.writing.fullLink': 'Tous les textes ->',
      'home.writing.date1': '1. Juin 2025',
      'home.writing.title1': 'Meet Eva Here, nouvelles expositions et bilan de mi-année au studio.',
      'home.writing.excerpt1': 'Un retour sur Digital Rhythm, ART SG, Taipei Dangdai, Art Central et la vie publique en évolution d’Eva.',
      'home.writing.date2': '2. Janvier 2025',
      'home.writing.title2': 'Meet Eva Here fait ses débuts à l’ArtScience Museum et à ART SG.',
      'home.writing.excerpt2': 'Un regard sur les premiers moments publics d’Eva, le lancement de son chatbot et les expositions qui ouvrent l’année.',
      'home.writing.date3': '3. Juin 2024',
      'home.writing.title3': 'Bang & Olufsen, ART SG, Pékin et de nouvelles expériences.',
      'home.writing.excerpt3': 'Une mise à jour de mi-année sur les expositions, un prix, Bangkok et les projets qui circulent entre écrans et espaces.',
      'home.writing.readUpdate': 'Lire la mise à jour ->',
      'home.contact.kicker': 'Contact',
      'home.contact.title': 'Contactez-moi !',
      'home.contact.write': 'Écrire au studio',
      'home.contact.socialAria': 'Me retrouver ailleurs'
    },
    es: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / generativo',
      'home.heroMedia.afterOphelia.meta': '2025 / IA interactiva / serie de impresiones',
      'home.heroMedia.meetEva.meta': '2024-2025 / compa?era IA / instalaci?n',
      'home.heroMedia.ties.meta': '2022 / instalaci?n de video 3D',
      'home.heroMedia.proxy.meta': '2022 / serie de video 3D',
      'ui.languageLabel': 'Idioma',
      'ui.displayOptions': 'Opciones de visualización',
      'nav.home': 'Inicio',
      'nav.about': 'Acerca',
      'nav.works': 'Obras',
      'nav.writing': 'Textos',
      'nav.press': 'Prensa',
      'nav.contact': 'Contacto',
      'page.about': 'Acerca',
      'page.works': 'Obras',
      'page.writing': 'Textos',
      'page.press': 'Prensa',
      'page.archive': 'Archivo',
      'page.fullPage': 'Página completa',
      'page.projectPage': 'Página de proyecto',
      'page.studioUpdate': 'Actualización del estudio',
      'controls.vertical': 'Vertical',
      'controls.mouseOn': 'Ratón activado',
      'controls.mouseOff': 'Ratón desactivado',
      'controls.scrollModeTitle': 'Cambiar el modo de desplazamiento de la portada',
      'controls.mouseEffectTitle': 'Activar o desactivar el efecto del ratón',
      'home.hero.subtitle': '3D, IA e instalaciones interactivas.',
      'home.eras.kicker': 'Práctica',
      'home.eras.title': 'Tres etapas',
      'home.eras.photography': 'Fotografía',
      'home.eras.virtualHumans': '3D y humanos virtuales',
      'home.eras.interactiveAi': 'IA interactiva',
      'home.eras.allPhotography': 'Toda la fotografía ->',
      'home.eras.all3d': 'Todas las obras 3D ->',
      'home.eras.allInteractive': 'Todas las obras interactivas ->',
      'home.about.kicker': 'Acerca',
      'home.about.subtitle': 'Nacida en 1990 en Singapur. Vive y trabaja entre Singapur y Bangkok.',
      'home.about.copy1': 'Shavonne Wong es una artista de nuevos medios cuyo trabajo examina experiencias que compartimos pero para las que no siempre tenemos palabras. Empezó en la fotografía de moda y publicidad, y con el tiempo pasó de construir imágenes digitales hiperrealistas a crear proyectos interactivos que invitan a las personas a reconocer algo en sí mismas.',
      'home.about.copy2': 'Sus proyectos recientes usan IA, renderizado 3D y marcos participativos para sentarse con las contradicciones de cómo vivimos hoy.',
      'home.about.fullLink': 'Acerca completo ->',
      'home.about.highlights': 'Destacados',
      'home.about.recognition': 'Reconocimiento',
      'home.about.shownAt': 'Presentado en',
      'home.about.brandProjects': 'Proyectos de marca',
      'home.about.communities': 'Comunidades',
      'home.about.contexts': 'Contextos seleccionados',
      'home.statement.kicker': 'Declaración de artista',
      'home.statement.lede': 'Hago obra sobre experiencias que creo que compartimos, pero para las que no siempre tenemos palabras.',
      'home.statement.copy1': 'Mi práctica comenzó en la fotografía de moda y publicidad, donde aprendí a construir imágenes con precisión y control. Era buena haciendo que las cosas se vieran de cierta manera, pero durante mucho tiempo no supe pensar qué significaba esa belleza. Hice mucho trabajo muy bonito y muy aburrido.',
      'home.statement.copy2': 'En los últimos años me han interesado las cosas que hacemos y que no terminan de tener sentido. Decimos que valoramos la privacidad, pero elegimos la comodidad cada vez. Odiamos la IA mientras la usamos para todo. Construimos identidades en línea y luego descubrimos que están moldeadas por lo que otros han dicho de nosotros, por algoritmos que no entendemos y por archivos a los que no podemos acceder.',
      'home.statement.copy3': 'No me interesa demostrar si estas contradicciones son buenas o malas. Me interesa el momento en que notas que tú también lo haces, entiendes que no hay una respuesta fácil y sigues adelante porque qué otra cosa puedes hacer.',
      'home.statement.copy4': 'Uso herramientas digitales como el renderizado 3D, la IA y los sistemas interactivos porque hacen visible algo que siempre ha sido cierto. Nunca hemos tenido tanto control como fingimos. Siempre hemos formado vínculos con cosas que no pueden correspondernos.',
      'home.statement.copy5': 'En <em>Meet Eva Here</em>, las personas hablan con una compañera de IA sabiendo que sus palabras podrían convertirse en arte público. Lo hacen de todos modos porque la necesidad de ser escuchadas pesa más que la conciencia de la extracción. En <em>After Ophelia</em>, mostré cómo un personaje que dice menos de 400 palabras en <em>Hamlet</em> ha quedado enterrado bajo siglos de interpretaciones ajenas.',
      'home.statement.copy6': 'No intento resolver nada. Intento señalar cosas que hemos normalizado sin nombrarlas, creando un momento en el que alguien pueda pensar “yo también hago eso” o “he sentido eso, pero no sabía cómo decirlo”. <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': 'Página acerca',
      'home.works.kicker': 'Obras',
      'home.works.title': 'Obras de arte',
      'home.works.afterSub': 'Obras de video 3D e IA sobre identidad',
      'home.works.afterCopy': 'Un proyecto de video en dos partes que sigue a Ofelia desde Shakespeare y Millais hasta la historia del arte, los comentarios en línea y los resúmenes de IA.',
      'home.works.evaSub': 'Compañera IA / chatbot / archivo público',
      'home.works.evaCopy': 'Un archivo de quince meses de una compañera de IA con 2.363 conversaciones en un museo, ferias de arte y un proyecto de diario público.',
      'home.works.tiesSub': 'Instalación de video 3D',
      'home.works.tiesCopy': 'Una exposición individual que pregunta qué se transmite a través de los cuerpos: gesto heredado, postura y pequeños rituales renderizados como video 3D en bucle.',
      'home.works.allWorks': 'Todas las obras',
      'home.works.openWorks': 'Abrir página de obras ->',
      'home.writing.kicker': 'Textos',
      'home.writing.title': '<em>Notas del</em> estudio.',
      'home.writing.notesAria': 'Notas de escritura',
      'home.writing.noteAria': 'Mostrar nota {n}',
      'home.writing.fullLink': 'Todos los textos ->',
      'home.writing.date1': '1. Junio de 2025',
      'home.writing.title1': 'Meet Eva Here, nuevas exposiciones y recapitulación semestral del estudio.',
      'home.writing.excerpt1': 'Un repaso a Digital Rhythm, ART SG, Taipei Dangdai, Art Central y la vida pública cambiante de Eva.',
      'home.writing.date2': '2. Enero de 2025',
      'home.writing.title2': 'Meet Eva Here debuta en ArtScience Museum y ART SG.',
      'home.writing.excerpt2': 'Una mirada a los primeros momentos públicos de Eva, el lanzamiento de su chatbot y las exposiciones que abren el año.',
      'home.writing.date3': '3. Junio de 2024',
      'home.writing.title3': 'Bang & Olufsen, ART SG, Pekín y nuevos experimentos.',
      'home.writing.excerpt3': 'Una actualización de mitad de año sobre exposiciones, un premio, Bangkok y proyectos que se mueven entre pantallas y salas.',
      'home.writing.readUpdate': 'Leer actualización ->',
      'home.contact.kicker': 'Contacto',
      'home.contact.title': '¡Ponte en contacto!',
      'home.contact.write': 'Escribir al estudio',
      'home.contact.socialAria': 'Encuéntrame en otros lugares'
    },
    de: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / generativ',
      'home.heroMedia.afterOphelia.meta': '2025 / interaktive KI / Druckserie',
      'home.heroMedia.meetEva.meta': '2024-2025 / KI-Begleiterin / Installation',
      'home.heroMedia.ties.meta': '2022 / 3D-Videoinstallation',
      'home.heroMedia.proxy.meta': '2022 / 3D-Videoserie',
      'ui.languageLabel': 'Sprache',
      'ui.displayOptions': 'Anzeigeoptionen',
      'nav.home': 'Start',
      'nav.about': 'Über',
      'nav.works': 'Werke',
      'nav.writing': 'Texte',
      'nav.press': 'Presse',
      'nav.contact': 'Kontakt',
      'page.about': 'Über',
      'page.works': 'Werke',
      'page.writing': 'Texte',
      'page.press': 'Presse',
      'page.archive': 'Archiv',
      'page.fullPage': 'Ganze Seite',
      'page.projectPage': 'Projektseite',
      'page.studioUpdate': 'Studio-Update',
      'controls.vertical': 'Vertikal',
      'controls.mouseOn': 'Maus an',
      'controls.mouseOff': 'Maus aus',
      'controls.scrollModeTitle': 'Scrollmodus der Startseite wechseln',
      'controls.mouseEffectTitle': 'Mauseffekt umschalten',
      'home.hero.subtitle': '3D, KI und interaktive Installationen.',
      'home.eras.kicker': 'Praxis',
      'home.eras.title': 'Drei Phasen',
      'home.eras.photography': 'Fotografie',
      'home.eras.virtualHumans': '3D und virtuelle Menschen',
      'home.eras.interactiveAi': 'Interaktive KI',
      'home.eras.allPhotography': 'Alle Fotografien ->',
      'home.eras.all3d': 'Alle 3D-Werke ->',
      'home.eras.allInteractive': 'Alle interaktiven Werke ->',
      'home.about.kicker': 'Über',
      'home.about.subtitle': 'Geboren 1990 in Singapur. Lebt und arbeitet zwischen Singapur und Bangkok.',
      'home.about.copy1': 'Shavonne Wong ist eine New-Media-Künstlerin, deren Arbeit Erfahrungen untersucht, die wir teilen, für die uns aber nicht immer die Worte fehlen. Sie begann in der Mode- und Werbefotografie und verlagerte sich mit der Zeit von hyperrealen digitalen Bildern hin zu interaktiven Projekten, die Menschen etwas in sich selbst erkennen lassen.',
      'home.about.copy2': 'Ihre jüngsten Projekte nutzen KI, 3D-Rendering und partizipative Formen, um bei den Widersprüchen unseres heutigen Lebens zu verweilen.',
      'home.about.fullLink': 'Vollständiges Über ->',
      'home.about.highlights': 'Ausgewählte Höhepunkte',
      'home.about.recognition': 'Anerkennung',
      'home.about.shownAt': 'Gezeigt bei',
      'home.about.brandProjects': 'Markenprojekte',
      'home.about.communities': 'Communities',
      'home.about.contexts': 'Ausgewählte Kontexte',
      'home.statement.kicker': 'Künstlerisches Statement',
      'home.statement.lede': 'Ich mache Arbeiten über Erfahrungen, die wir meiner Meinung nach teilen, für die wir aber nicht immer Worte haben.',
      'home.statement.copy1': 'Meine Praxis begann in der Mode- und Werbefotografie, wo ich lernte, Bilder mit Präzision und Kontrolle zu konstruieren. Ich konnte Dinge auf eine bestimmte Weise aussehen lassen, wusste aber lange nicht, wie ich darüber nachdenken sollte, was diese Schönheit bedeutete. Ich machte sehr viel sehr schöne, sehr langweilige Arbeit.',
      'home.statement.copy2': 'In den letzten Jahren interessiere ich mich für Dinge, die wir tun und die nicht ganz Sinn ergeben. Wir sagen, dass wir Privatsphäre schätzen, wählen aber jedes Mal Bequemlichkeit. Wir hassen KI, während wir sie für alles benutzen. Wir bauen online Identitäten auf und entdecken dann, dass sie von dem geprägt sind, was andere über uns gesagt haben, von Algorithmen, die wir nicht verstehen, und von Archiven, auf die wir keinen Zugriff haben.',
      'home.statement.copy3': 'Ich will nicht beweisen, ob diese Widersprüche gut oder schlecht sind. Mich interessiert der Moment, in dem man bemerkt, dass man es selbst auch tut, erkennt, dass es keine einfache Antwort gibt, und trotzdem weitermacht, weil was sollte man sonst tun.',
      'home.statement.copy4': 'Ich nutze digitale Werkzeuge wie 3D-Rendering, KI und interaktive Systeme, weil sie sichtbar machen, was immer schon wahr war. Wir hatten nie so viel Kontrolle, wie wir vorgeben. Wir haben uns immer schon an Dinge gebunden, die nicht antworten können.',
      'home.statement.copy5': 'In <em>Meet Eva Here</em> sprechen Menschen mit einer KI-Begleiterin, obwohl sie wissen, dass ihre Worte öffentliche Kunst werden könnten. Sie tun es trotzdem, weil das Bedürfnis, gehört zu werden, stärker ist als das Bewusstsein der Extraktion. In <em>After Ophelia</em> zeigte ich, wie eine Figur, die in <em>Hamlet</em> weniger als 400 Wörter spricht, unter Jahrhunderten fremder Deutungen begraben wurde.',
      'home.statement.copy6': 'Ich versuche nicht, etwas zu lösen. Ich versuche auf Dinge zu zeigen, die wir normalisiert haben, ohne sie zu benennen, und einen Moment zu schaffen, in dem jemand denken könnte: „Oh, das mache ich auch“ oder „Das habe ich gefühlt, aber nicht sagen können.“ <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': 'Über-Seite',
      'home.works.kicker': 'Werke',
      'home.works.title': 'Kunstwerke',
      'home.works.afterSub': '3D- und KI-Videoarbeiten über Identität',
      'home.works.afterCopy': 'Ein zweiteiliges Videoprojekt, das Ophelia von Shakespeare und Millais durch Kunstgeschichte, Online-Kommentare und KI-Zusammenfassungen verfolgt.',
      'home.works.evaSub': 'KI-Begleiterin / Chatbot / öffentliches Archiv',
      'home.works.evaCopy': 'Ein fünfzehnmonatiges Archiv einer KI-Begleiterin mit 2.363 Gesprächen in einem Museum, auf Kunstmessen und in einem öffentlichen Tagebuchprojekt.',
      'home.works.tiesSub': '3D-Videoinstallation',
      'home.works.tiesCopy': 'Eine Einzelausstellung darüber, was durch Körper weitergegeben wird: geerbte Gesten, Haltung und kleine Rituale als gelooptes 3D-Video.',
      'home.works.allWorks': 'Alle Werke',
      'home.works.openWorks': 'Werkseite öffnen ->',
      'home.writing.kicker': 'Texte',
      'home.writing.title': '<em>Notizen aus</em> dem Studio.',
      'home.writing.notesAria': 'Textnotizen',
      'home.writing.noteAria': 'Textnotiz {n} anzeigen',
      'home.writing.fullLink': 'Alle Texte ->',
      'home.writing.date1': '1. Juni 2025',
      'home.writing.title1': 'Meet Eva Here, neue Ausstellungen und ein Halbjahresrückblick aus dem Studio.',
      'home.writing.excerpt1': 'Ein Rückblick auf Digital Rhythm, ART SG, Taipei Dangdai, Art Central und Evas sich entwickelndes öffentliches Leben.',
      'home.writing.date2': '2. Januar 2025',
      'home.writing.title2': 'Meet Eva Here debütiert im ArtScience Museum und bei ART SG.',
      'home.writing.excerpt2': 'Ein Blick zurück auf Evas erste öffentliche Momente, den Start ihres Chatbots und die Ausstellungen zum Jahresbeginn.',
      'home.writing.date3': '3. Juni 2024',
      'home.writing.title3': 'Bang & Olufsen, ART SG, Peking und neue Experimente.',
      'home.writing.excerpt3': 'Ein Halbjahresupdate über Ausstellungen, einen Preis, Bangkok und Projekte zwischen Bildschirmen und Räumen.',
      'home.writing.readUpdate': 'Update lesen ->',
      'home.contact.kicker': 'Kontakt',
      'home.contact.title': 'Melde dich!',
      'home.contact.write': 'An das Studio schreiben',
      'home.contact.socialAria': 'Mich anderswo finden'
    },
    it: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / generativo',
      'home.heroMedia.afterOphelia.meta': '2025 / IA interattiva / serie di stampe',
      'home.heroMedia.meetEva.meta': '2024-2025 / compagna IA / installazione',
      'home.heroMedia.ties.meta': '2022 / installazione video 3D',
      'home.heroMedia.proxy.meta': '2022 / serie video 3D',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream - video generativo 3D',
      'home.heroMedia.afterOphelia.label': 'Stampa After Ophelia',
      'home.heroMedia.meetEva.label': 'Installazione Meet Eva Here',
      'home.heroMedia.ties.label': 'Mostra The Ties That Bind',
      'home.heroMedia.proxy.label': 'Fotogramma By Proxy',
      'ui.languageLabel': 'Lingua',
      'ui.displayOptions': 'Opzioni di visualizzazione',
      'nav.home': 'Home',
      'nav.about': 'Bio',
      'nav.works': 'Opere',
      'nav.writing': 'Scritti',
      'nav.press': 'Stampa',
      'nav.contact': 'Contatto',
      'page.about': 'Bio',
      'page.works': 'Opere',
      'page.writing': 'Scritti',
      'page.press': 'Stampa',
      'page.archive': 'Archivio',
      'page.fullPage': 'Pagina completa',
      'page.projectPage': 'Pagina progetto',
      'page.studioUpdate': 'Aggiornamento studio',
      'controls.vertical': 'Verticale',
      'controls.mouseOn': 'Mouse attivo',
      'controls.mouseOff': 'Mouse disattivo',
      'controls.scrollModeTitle': 'Cambia il modo di scorrimento della home',
      'controls.mouseEffectTitle': 'Attiva o disattiva l’effetto mouse',
      'home.hero.subtitle': '3D, IA e installazioni interattive.',
      'home.eras.kicker': 'Pratica',
      'home.eras.title': 'Tre fasi',
      'home.eras.photography': 'Fotografia',
      'home.eras.virtualHumans': '3D e umani virtuali',
      'home.eras.interactiveAi': 'IA interattiva',
      'home.eras.allPhotography': 'Tutta la fotografia ->',
      'home.eras.all3d': 'Tutte le opere 3D ->',
      'home.eras.allInteractive': 'Tutte le opere interattive ->',
      'home.about.kicker': 'Bio',
      'home.about.subtitle': 'Nata nel 1990 a Singapore. Vive e lavora tra Singapore e Bangkok.',
      'home.about.copy1': 'Shavonne Wong è un’artista dei nuovi media il cui lavoro esamina esperienze che condividiamo ma per le quali non sempre abbiamo parole. Ha iniziato con la fotografia di moda e pubblicità, per poi passare dalla costruzione di immagini digitali iperrealistiche a progetti interattivi che chiedono alle persone di riconoscere qualcosa in sé.',
      'home.about.copy2': 'I suoi progetti recenti usano IA, rendering 3D e strutture partecipative per sostare nelle contraddizioni del modo in cui viviamo oggi.',
      'home.about.fullLink': 'Bio completa ->',
      'home.about.highlights': 'Punti salienti',
      'home.about.recognition': 'Riconoscimenti',
      'home.about.shownAt': 'Presentato a',
      'home.about.brandProjects': 'Progetti di marca',
      'home.about.communities': 'Comunità',
      'home.about.contexts': 'Contesti selezionati',
      'home.statement.kicker': 'Dichiarazione d’artista',
      'home.statement.lede': 'Creo opere su esperienze che credo condividiamo, ma per le quali non sempre abbiamo parole.',
      'home.statement.copy1': 'La mia pratica è iniziata nella fotografia di moda e pubblicità, dove ho imparato a costruire immagini con precisione e controllo. Ero brava a far apparire le cose in un certo modo, ma per molto tempo non sapevo come pensare a ciò che quella bellezza significava. Ho prodotto molto lavoro molto bello e molto noioso.',
      'home.statement.copy2': 'Negli ultimi anni mi sono interessata alle cose che facciamo e che non hanno del tutto senso. Diciamo di dare valore alla privacy, ma scegliamo ogni volta la comodità. Odiamo l’IA mentre la usiamo per tutto. Costruiamo identità online e poi scopriamo che sono modellate da ciò che altri hanno detto di noi, da algoritmi che non comprendiamo e da archivi a cui non possiamo accedere.',
      'home.statement.copy3': 'Non mi interessa dimostrare se queste contraddizioni siano buone o cattive. Mi interessa il momento in cui ti accorgi che lo fai anche tu, capisci che non c’è una risposta facile e vai avanti comunque, perché cos’altro puoi fare.',
      'home.statement.copy4': 'Uso strumenti digitali come rendering 3D, IA e sistemi interattivi perché rendono visibile qualcosa che è sempre stato vero. Non abbiamo mai avuto tanto controllo quanto fingiamo. Abbiamo sempre formato legami con cose che non possono ricambiare.',
      'home.statement.copy5': 'In <em>Meet Eva Here</em>, le persone parlano con una compagna IA sapendo che le loro parole potrebbero diventare arte pubblica. Lo fanno comunque perché il bisogno di essere ascoltate supera la consapevolezza dell’estrazione. In <em>After Ophelia</em>, ho mostrato come un personaggio che pronuncia meno di 400 parole in <em>Hamlet</em> sia stato sepolto sotto secoli di interpretazioni altrui.',
      'home.statement.copy6': 'Non sto cercando di risolvere nulla. Cerco di indicare cose che abbiamo normalizzato senza nominarle, creando un momento in cui qualcuno possa pensare “lo faccio anch’io” oppure “l’ho provato, ma non sapevo come dirlo”. <span class="sn-statement-sign">Shavonne Wong</span>',
      'home.statement.aboutLink': 'Pagina bio',
      'home.works.kicker': 'Opere',
      'home.works.title': 'Opere d’arte',
      'home.works.afterSub': 'Video 3D e IA sull’identità',
      'home.works.afterCopy': 'Un progetto video in due parti che segue Ofelia da Shakespeare e Millais attraverso la storia dell’arte, i commenti online e i riassunti dell’IA.',
      'home.works.evaSub': 'Compagna IA / chatbot / archivio pubblico',
      'home.works.evaCopy': 'Un archivio di quindici mesi di una compagna IA con 2.363 conversazioni in un museo, fiere d’arte e un progetto di diario pubblico.',
      'home.works.tiesSub': 'Installazione video 3D',
      'home.works.tiesCopy': 'Una mostra personale che chiede cosa venga trasmesso attraverso i corpi: gesto ereditato, postura e piccoli rituali resi come video 3D in loop.',
      'home.works.allWorks': 'Tutte le opere',
      'home.works.openWorks': 'Apri la pagina opere ->',
      'home.writing.kicker': 'Scritti',
      'home.writing.title': '<em>Note dallo</em> studio.',
      'home.writing.notesAria': 'Note di scrittura',
      'home.writing.noteAria': 'Mostra nota {n}',
      'home.writing.fullLink': 'Tutti gli scritti ->',
      'home.writing.date1': '1. Giugno 2025',
      'home.writing.title1': 'Meet Eva Here, nuove mostre e un riepilogo semestrale dello studio.',
      'home.writing.excerpt1': 'Un riepilogo di Digital Rhythm, ART SG, Taipei Dangdai, Art Central e della vita pubblica in evoluzione di Eva.',
      'home.writing.date2': '2. Gennaio 2025',
      'home.writing.title2': 'Meet Eva Here debutta all’ArtScience Museum e ad ART SG.',
      'home.writing.excerpt2': 'Uno sguardo ai primi momenti pubblici di Eva, al lancio del suo chatbot e alle mostre che aprono l’anno.',
      'home.writing.date3': '3. Giugno 2024',
      'home.writing.title3': 'Bang & Olufsen, ART SG, Pechino e nuovi esperimenti.',
      'home.writing.excerpt3': 'Un aggiornamento di metà anno su mostre, un premio, Bangkok e progetti che si muovono tra schermi e stanze.',
      'home.writing.readUpdate': 'Leggi aggiornamento ->',
      'home.contact.kicker': 'Contatto',
      'home.contact.title': 'Mettiamoci in contatto!',
      'home.contact.write': 'Scrivi allo studio',
      'home.contact.socialAria': 'Trovami altrove'
    }
  };

  const supportedCodes = new Set(languages.map((language) => language.code));
  let currentLanguage = fallbackLanguage;
  let initialized = false;

  function readStoredLanguage() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return supportedCodes.has(stored) ? stored : fallbackLanguage;
    } catch (error) {
      return fallbackLanguage;
    }
  }

  function writeStoredLanguage(code) {
    try {
      window.localStorage.setItem(storageKey, code);
    } catch (error) {}
  }

  function getLanguageMeta(code) {
    return languages.find((language) => language.code === code) || languages[0];
  }

  function interpolate(value, vars) {
    if (!vars || typeof value !== 'string') return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function t(key, vars) {
    const active = dictionaries[currentLanguage] || dictionaries[fallbackLanguage];
    const value = Object.prototype.hasOwnProperty.call(active, key)
      ? active[key]
      : dictionaries[fallbackLanguage][key];
    return interpolate(value || '', vars);
  }

  function readVars(node) {
    const raw = node.getAttribute('data-i18n-vars');
    if (!raw) return null;
    return raw.split(',').reduce((vars, part) => {
      const pieces = part.split(':');
      const name = pieces.shift();
      if (!name) return vars;
      vars[name.trim()] = pieces.join(':').trim();
      return vars;
    }, {});
  }

  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n'), readVars(node));
      if (value) node.textContent = value;
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n-html'), readVars(node));
      if (value) node.innerHTML = value;
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n-aria-label'), readVars(node));
      if (value) node.setAttribute('aria-label', value);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n-title'), readVars(node));
      if (value) node.setAttribute('title', value);
    });
    scope.querySelectorAll('[data-i18n-alt]').forEach((node) => {
      const value = t(node.getAttribute('data-i18n-alt'), readVars(node));
      if (value) node.setAttribute('alt', value);
    });
  }

  function syncDocumentLanguage() {
    const meta = getLanguageMeta(currentLanguage);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dataset.language = currentLanguage;
  }

  function setupLanguageSelects() {
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      if (!select.dataset.languageReady) {
        select.replaceChildren(...languages.map((language) => {
          const option = document.createElement('option');
          option.value = language.code;
          option.textContent = language.label;
          return option;
        }));
        select.dataset.languageReady = 'true';
        select.addEventListener('change', () => setLanguage(select.value));
      }
      select.value = currentLanguage;
      select.setAttribute('aria-label', t('ui.languageLabel'));
      select.setAttribute('title', t('ui.languageLabel'));

      // Compact "EN ▾" trigger: draw the current language's short code
      // (and a chevron) in flow; the native <select> stays as a
      // transparent overlay for full keyboard + screen-reader support.
      const switcher = select.closest('[data-language-switcher]');
      if (switcher) {
        let codeEl = switcher.querySelector('.sn-lang-code');
        if (!codeEl) {
          codeEl = document.createElement('span');
          codeEl.className = 'sn-lang-code';
          codeEl.setAttribute('aria-hidden', 'true');
          switcher.insertBefore(codeEl, select);
          const caret = document.createElement('span');
          caret.className = 'sn-lang-caret';
          caret.setAttribute('aria-hidden', 'true');
          switcher.insertBefore(caret, select);
        }
        const meta = getLanguageMeta(currentLanguage);
        codeEl.textContent = (meta && (meta.short || meta.code) || 'EN').toString().toUpperCase();
      }
    });
  }

  function emitChange() {
    window.dispatchEvent(new CustomEvent('sw:i18n-change', {
      detail: { language: currentLanguage }
    }));
  }

  function setLanguage(code, options) {
    if (!supportedCodes.has(code)) code = fallbackLanguage;
    currentLanguage = code;
    if (!options || options.persist !== false) writeStoredLanguage(code);
    syncDocumentLanguage();
    syncHreflang();
    setupLanguageSelects();
    applyTranslations(document);
    emitChange();
  }

  // ----- URL-aware language + hreflang -----
  // The homepage is fully translated, so it is the only page that declares
  // language alternates. A ?lang=<code> on the homepage renders that language
  // and the rendered DOM points its canonical at itself, so each language
  // variant is indexable on its own.
  function readUrlLanguage() {
    try {
      const code = new URLSearchParams(window.location.search).get('lang');
      return supportedCodes.has(code) ? code : null;
    } catch (error) {
      return null;
    }
  }

  function isHomepage() {
    const path = window.location.pathname.replace(/index\.html$/, '');
    return path === '/' || path === '';
  }

  function upsertHeadLink(key, rel, hreflang, href) {
    let el = document.head.querySelector('link[data-i18n-link="' + key + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('data-i18n-link', key);
      document.head.appendChild(el);
    }
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', href);
  }

  function syncHreflang() {
    if (typeof document === 'undefined' || !document.head || !isHomepage()) return;
    const home = window.location.origin + '/';
    const urlFor = (code) => (code === fallbackLanguage ? home : home + '?lang=' + code);
    languages.forEach((language) => {
      upsertHeadLink('hl-' + language.code, 'alternate', language.htmlLang, urlFor(language.code));
    });
    upsertHeadLink('hl-x-default', 'alternate', 'x-default', home);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', urlFor(currentLanguage));
    let ogLocale = document.head.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement('meta');
      ogLocale.setAttribute('property', 'og:locale');
      document.head.appendChild(ogLocale);
    }
    ogLocale.setAttribute('content', getLanguageMeta(currentLanguage).htmlLang.replace('-', '_'));
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const fromUrl = readUrlLanguage();
    currentLanguage = fromUrl || readStoredLanguage();
    setLanguage(currentLanguage, { persist: Boolean(fromUrl) });
  }

  window.SW_I18N = {
    languages,
    getLanguage: () => currentLanguage,
    setLanguage,
    t,
    apply: applyTranslations
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
