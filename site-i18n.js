(function () {
  'use strict';

  const storageKey = 'sw-language';
  const fallbackLanguage = 'en';
  // Active (tier-1) languages. Each carries a pathSlug used for page-first
  // localized URLs (e.g. /about/zh-hans/). en lives at the page root.
  const languages = [
    { code: 'en', htmlLang: 'en', label: 'English', short: 'EN', pathSlug: '' },
    { code: 'zh-Hans', htmlLang: 'zh-Hans', label: '简体中文', short: '简', pathSlug: 'zh-hans', aiNote: '(AI 翻译)', aiNoteTitle: '本页面由 AI 翻译，原文为英文' },
    { code: 'zh-Hant', htmlLang: 'zh-Hant', label: '繁體中文', short: '繁', pathSlug: 'zh-hant', aiNote: '(AI 翻譯)', aiNoteTitle: '本頁面由 AI 翻譯，原文為英文' }
  ];
  // Tier-2 languages (ja, ko, es, de, it) are parked until phase 2. Their
  // dictionaries remain defined below but are not offered in the switcher
  // until a reviewed static build exists for them.

  const en = {
    'meta.indexTitle': 'Shavonne Wong | New media artist (AI, 3D, interactive installation)',
    'ui.languageLabel': 'Language',
    'ui.displayOptions': 'Display options',
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.works': 'Works',
    'nav.writing': 'Writing',
    'nav.journal': 'Journal',
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
    'home.hero.cred': 'Exhibited at <strong>Venice Biennale</strong>, ART SG, ArtScience Museum, Paris Photo, Taipei Dangdai',
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
    'home.eras.lede': 'I started in <span class="sn-era-term" data-era="fashion"><em>fashion photography</em></span>. Since 2020 I have been building in <span class="sn-era-term" data-era="3d"><em>3D and virtual humans</em></span>, and since 2023 also making <span class="sn-era-term" data-era="ai"><em>interactive installations</em></span> about how we interact and behave around machines.',
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
    'home.about.copy1': 'Shavonne Wong is a new media artist who treats emerging technology as a mirror, making work about who we become when machines see, listen, and remember for us. She started in fashion and advertising photography, and over time shifted from hyperreal digital images to interactive projects built from AI, 3D rendering, and participatory frameworks.',
    'home.about.copy2': 'She is currently developing Conditional, a participatory installation exploring the discomfort of being both watched too closely and not seen at all.',
    'home.about.fullLink': 'Full about ->',
    'home.about.highlights': 'Selected highlights',
    'home.about.recognition': 'Recognition',
    'home.about.recognitionValue': 'Forbes 30 Under 30 Asia - Arts / Prestige 40 Under 40',
    'home.about.shownAt': 'Shown at',
    'home.about.shownAtValue': 'ArtScience Museum / Venice Biennale / Paris Photo / ART SG / Taipei Dangdai',
    'home.about.brandProjects': 'Brand projects',
    'home.about.brandProjectsValue': 'Vogue Singapore / Shu Uemura / Bang & Olufsen',
    'home.about.communities': 'Communities',
    'home.about.communitiesValue': 'Co-founder, NFT Asia / Member, BLOOM',
    'home.about.contexts': 'Selected Contexts',
    'home.statement.kicker': 'Artist statement',
    'home.statement.lede': 'I treat emerging technology as a mirror. My work is about who we become when machines see, listen, and remember for us, and about the experiences we share but do not always have words for.',
    'home.statement.copy1': 'My practice began in fashion and advertising photography, where I learned to construct images with precision and control. I was good at making things look a certain way, but for a long time I did not know how to think about what that beauty meant. I made a lot of very pretty, very boring work.',
    'home.statement.copy2': 'In recent years, I have become interested in the things we do that do not quite make sense. We say we value privacy but choose convenience every time. We critique AI while depending on it for everything. We build identities online and then discover those identities are shaped by what others have said about us, by algorithms we do not understand, and by archives we cannot access.',
    'home.statement.copy3': 'The old fear was being watched too closely. The newer one is being overlooked entirely.',
    'home.statement.copy4': 'I am not interested in proving these contradictions are bad or good. I am interested in the moment when you notice you are doing it too, and you realize there is no easy answer, and you keep going anyway because what else can you do.',
    'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> explored how people actually behave with AI, not how we say we would. In Singapore, people made polite small talk with her. In New York, they tried to break her in under a minute. A Korean visitor was upset that she skipped the right honorifics, not because she malfunctioned but because it read as rude. The same system meant something different in every room it was switched on in.',
    'home.statement.copy6': 'I am currently developing <a href="/works/conditional/"><em>Conditional</em></a>, a participatory installation that explores the contemporary discomfort of being both watched too closely and not seen at all. A digital mirror renders the room in full, except you.',
    'home.statement.copy7': 'I am not trying to solve anything. I am trying to point at things we have normalized without naming them, creating a moment where someone might think "oh, I do that too" or "I have felt that but did not know how to say it."',
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
    'home.writing.date1': '1. June 2026',
    'home.writing.title1': 'Goodbye to Eva, into the mirror.',
    'home.writing.excerpt1': 'A studio update on After Ophelia, Meet Eva Here, and the shift from public companions to reflective systems.',
    'home.writing.date2': '2. June 2025',
    'home.writing.title2': 'Public rooms.',
    'home.writing.excerpt2': 'A recap across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the evolving public life of Eva.',
    'home.writing.date3': '3. January 2025',
    'home.writing.title3': 'Eva goes public.',
    'home.writing.excerpt3': 'A look back at Eva\'s first public moments, the launch of her chatbot, and the exhibitions opening the year.',
    'home.writing.readUpdate': 'Read update ->',
    'home.contact.title': 'Contact<em>.</em>',
    'home.contact.linksAria': 'Studio contact links',
    'home.contact.elsewhere': 'Elsewhere',
    'home.contact.studioNotes': 'Studio notes',
    'home.contact.subTagline': 'New work, exhibitions, and edition drops, straight from the studio.',
    'home.contact.emailAria': 'Email address',
    'home.contact.subscribe': 'Subscribe',
    'home.contact.honey': 'Leave this field empty',
    'home.contact.name': 'Name',
    'home.contact.email': 'Email',
    'home.contact.enquiryType': 'Enquiry type',
    'home.contact.selectOne': 'Select one',
    'home.contact.acquisition': 'Acquisition',
    'home.contact.commission': 'Commission',
    'home.contact.exhibition': 'Exhibition',
    'home.contact.press': 'Press',
    'home.contact.collaboration': 'Collaboration',
    'home.contact.other': 'Other',
    'home.contact.message': 'Message',
    'home.contact.send': 'Send message'
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
      'nav.journal': '日志',
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
      'home.hero.cred': '曾展出于 <strong>Venice Biennale</strong>、ART SG、ArtScience Museum、Paris Photo、Taipei Dangdai',
      'home.heroMedia.whirlwind.meta': '2024 / 3D / 生成式',
      'home.heroMedia.afterOphelia.meta': '2025 / 互动 AI / 版画系列',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI 伴侣 / 装置',
      'home.heroMedia.ties.meta': '2022 / 3D 影像装置',
      'home.heroMedia.proxy.meta': '2022 / 3D 影像系列',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream，3D 生成影像',
      'home.heroMedia.afterOphelia.label': 'After Ophelia 版画',
      'home.heroMedia.meetEva.label': 'Meet Eva Here 装置',
      'home.heroMedia.ties.label': 'The Ties That Bind 展览',
      'home.heroMedia.proxy.label': 'By Proxy 静帧',
      'home.eras.kicker': '实践',
      'home.eras.title': '三个阶段',
      'home.eras.lede': '我从<span class="sn-era-term" data-era="fashion"><em>时尚摄影</em></span>起步。自 2020 年起，我一直在 <span class="sn-era-term" data-era="3d"><em>3D 与虚拟人类</em></span>领域创作，并自 2023 年起也开始制作关于我们如何与机器互动、如何在机器周围行动的<span class="sn-era-term" data-era="ai"><em>互动装置</em></span>。',
      'home.eras.act3dEyebrow': '自 2020 年 · 持续中',
      'home.eras.act3dTitle': '3D 与虚拟人类',
      'home.eras.actAiEyebrow': '自 2023 年 · 持续中',
      'home.eras.actAiTitle': '互动 AI',
      'home.eras.seeWorks': '查看作品 ->',
      'home.eras.photography': '摄影',
      'home.eras.virtualHumans': '3D 与虚拟人类',
      'home.eras.interactiveAi': '互动 AI',
      'home.eras.allPhotography': '所有摄影 ->',
      'home.eras.all3d': '所有 3D 作品 ->',
      'home.eras.allInteractive': '所有互动作品 ->',
      'home.about.kicker': '关于',
      'home.about.subtitle': '1990 年生于新加坡。生活与工作往返于新加坡和曼谷。',
      'home.about.copy1': 'Shavonne Wong 是一位新媒体艺术家，她把新兴技术当作一面镜子，作品关乎当机器代替我们观看、聆听与记忆时，我们会变成什么样的人。她起步于时尚与广告摄影，之后从高度拟真的数字图像，转向由 AI、3D 渲染与参与式框架构成的互动创作。',
      'home.about.copy2': '她目前正在创作 Conditional，一件参与式装置，探讨那种既被看得太仔细、又完全不被看见的不适。',
      'home.about.fullLink': '完整介绍 ->',
      'home.about.highlights': '精选亮点',
      'home.about.recognition': '荣誉',
      'home.about.shownAt': '展出于',
      'home.about.brandProjects': '品牌项目',
      'home.about.communities': '社群',
      'home.about.contexts': '精选语境',
      'home.statement.kicker': '艺术家陈述',
      'home.statement.lede': '我把新兴技术当作一面镜子。我的创作关乎当机器代替我们观看、聆听与记忆时，我们会变成什么样的人，也关乎那些我们共享、却未必总有语言表达的经验。',
      'home.statement.copy1': '我的实践始于时尚与广告摄影，在那里我学会了以精确和控制来构建图像。我擅长让事物看起来像某种样子，但很长一段时间里，我并不知道该如何理解那种美意味着什么。我做过很多非常漂亮、也非常无聊的作品。',
      'home.statement.copy2': '近些年，我对那些并不完全合理的行为越来越感兴趣。我们说重视隐私，却一次次选择便利。我们批评 AI，却又依赖它处理几乎所有事情。我们在网上建立身份，随后发现这些身份被他人的叙述、我们不理解的算法，以及无法取回的档案塑造。',
      'home.statement.copy3': '过去的恐惧是被看得太仔细。如今新的恐惧是被彻底忽略。',
      'home.statement.copy4': '我并不想证明这些矛盾是好是坏。我感兴趣的是你意识到自己也在这样做的那一刻：你发现没有简单答案，却仍然继续，因为除此之外还能怎么办。',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> 探讨的是人们与 AI 相处时的真实行为，而不是我们口中所说的样子。在新加坡，人们与她客气地寒暄。在纽约，人们不到一分钟就试图把她弄坏。一位韩国观众因为她漏掉了正确的敬语而不快，不是因为她出了故障，而是因为那听起来很失礼。同一个系统，在每一个被打开的房间里，意味着不同的东西。',
      'home.statement.copy6': '我目前正在创作 <a href="/works/conditional/"><em>Conditional</em></a>，一件参与式装置，探讨当代那种既被看得太仔细、又完全不被看见的不适。一面数字镜子完整地映出整个房间，只是没有你。',
      'home.statement.copy7': '我并不是想解决什么。我想指出那些我们已经习以为常却还没有命名的事物，制造一个瞬间，让某个人想到：“原来我也这样”，或“我曾经这样感受，却不知道怎么说。”',
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
      'home.writing.date1': '1. 2026 年 6 月',
      'home.writing.title1': '告别 Eva，走进镜子。',
      'home.writing.excerpt1': '一则工作室近况，关于 After Ophelia、Meet Eva Here，以及从公共陪伴到映照系统的转变。',
      'home.writing.date2': '2. 2025 年 6 月',
      'home.writing.title2': '公共空间。',
      'home.writing.excerpt2': '回顾 Digital Rhythm、ART SG、Taipei Dangdai、Art Central，以及 Eva 不断展开的公共生活。',
      'home.writing.date3': '3. 2025 年 1 月',
      'home.writing.title3': 'Eva 走向公众。',
      'home.writing.excerpt3': '回顾 Eva 最初的公开时刻、她的聊天机器人上线，以及为这一年揭开序幕的展览。',
      'home.writing.readUpdate': '阅读更新 ->',
      'home.contact.title': '联系<em>.</em>',
      'home.contact.linksAria': '工作室联系方式',
      'home.contact.elsewhere': '其他平台',
      'home.contact.studioNotes': '工作室通讯',
      'home.contact.subTagline': '新作品、展览与限量发行，来自工作室。',
      'home.contact.emailAria': '电子邮箱',
      'home.contact.subscribe': '订阅',
      'home.contact.honey': '请勿填写此栏',
      'home.contact.name': '姓名',
      'home.contact.email': '电子邮箱',
      'home.contact.enquiryType': '咨询类型',
      'home.contact.selectOne': '请选择',
      'home.contact.acquisition': '收藏',
      'home.contact.commission': '委托创作',
      'home.contact.exhibition': '展览',
      'home.contact.press': '媒体',
      'home.contact.collaboration': '合作',
      'home.contact.other': '其他',
      'home.contact.message': '留言',
      'home.contact.send': '发送留言'
    },
    'zh-Hant': {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / 生成式',
      'home.heroMedia.afterOphelia.meta': '2025 / 互動 AI / 版畫系列',
      'home.heroMedia.meetEva.meta': '2024-2025 / AI 伴侶 / 裝置',
      'home.heroMedia.ties.meta': '2022 / 3D 影像裝置',
      'home.heroMedia.proxy.meta': '2022 / 3D 影像系列',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream，3D 生成影像',
      'home.heroMedia.afterOphelia.label': 'After Ophelia 版畫',
      'home.heroMedia.meetEva.label': 'Meet Eva Here 裝置',
      'home.heroMedia.ties.label': 'The Ties That Bind 展覽',
      'home.heroMedia.proxy.label': 'By Proxy 靜幀',
      'ui.languageLabel': '語言',
      'ui.displayOptions': '顯示選項',
      'nav.home': '首頁',
      'nav.about': '關於',
      'nav.works': '作品',
      'nav.writing': '文字',
      'nav.journal': '日誌',
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
      'home.hero.cred': '曾展出於 <strong>Venice Biennale</strong>、ART SG、ArtScience Museum、Paris Photo、Taipei Dangdai',
      'home.eras.kicker': '實踐',
      'home.eras.title': '三個階段',
      'home.eras.lede': '我從<span class="sn-era-term" data-era="fashion"><em>時尚攝影</em></span>起步。自 2020 年起，我一直在 <span class="sn-era-term" data-era="3d"><em>3D 與虛擬人類</em></span>領域創作，並自 2023 年起也開始製作關於我們如何與機器互動、如何在機器周圍行動的<span class="sn-era-term" data-era="ai"><em>互動裝置</em></span>。',
      'home.eras.act3dEyebrow': '自 2020 年 · 持續中',
      'home.eras.act3dTitle': '3D 與虛擬人類',
      'home.eras.actAiEyebrow': '自 2023 年 · 持續中',
      'home.eras.actAiTitle': '互動 AI',
      'home.eras.seeWorks': '查看作品 ->',
      'home.eras.photography': '攝影',
      'home.eras.virtualHumans': '3D 與虛擬人類',
      'home.eras.interactiveAi': '互動 AI',
      'home.eras.allPhotography': '所有攝影 ->',
      'home.eras.all3d': '所有 3D 作品 ->',
      'home.eras.allInteractive': '所有互動作品 ->',
      'home.about.kicker': '關於',
      'home.about.subtitle': '1990 年生於新加坡。生活與工作往返於新加坡和曼谷。',
      'home.about.copy1': 'Shavonne Wong 是一位新媒體藝術家，她把新興技術當作一面鏡子，作品關乎當機器代替我們觀看、聆聽與記憶時，我們會變成什麼樣的人。她起步於時尚與廣告攝影，之後從高度擬真的數位影像，轉向由 AI、3D 渲染與參與式框架構成的互動創作。',
      'home.about.copy2': '她目前正在創作 Conditional，一件參與式裝置，探討那種既被看得太仔細、又完全不被看見的不適。',
      'home.about.fullLink': '完整介紹 ->',
      'home.about.highlights': '精選亮點',
      'home.about.recognition': '榮譽',
      'home.about.shownAt': '展出於',
      'home.about.brandProjects': '品牌項目',
      'home.about.communities': '社群',
      'home.about.contexts': '精選語境',
      'home.statement.kicker': '藝術家陳述',
      'home.statement.lede': '我把新興技術當作一面鏡子。我的創作關乎當機器代替我們觀看、聆聽與記憶時，我們會變成什麼樣的人，也關乎那些我們共享、卻未必總有語言表達的經驗。',
      'home.statement.copy1': '我的實踐始於時尚與廣告攝影，在那裡我學會了以精確和控制來構建圖像。我擅長讓事物看起來像某種樣子，但很長一段時間裡，我並不知道該如何理解那種美意味著什麼。我做過很多非常漂亮、也非常無聊的作品。',
      'home.statement.copy2': '近些年，我對那些並不完全合理的行為越來越感興趣。我們說重視隱私，卻一次次選擇便利。我們批評 AI，卻又依賴它處理幾乎所有事情。我們在網上建立身份，隨後發現這些身份被他人的敘述、我們不理解的演算法，以及無法取回的檔案塑造。',
      'home.statement.copy3': '過去的恐懼是被看得太仔細。如今新的恐懼是被徹底忽略。',
      'home.statement.copy4': '我並不想證明這些矛盾是好是壞。我感興趣的是你意識到自己也在這樣做的那一刻：你發現沒有簡單答案，卻仍然繼續，因為除此之外還能怎麼辦。',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> 探討的是人們與 AI 相處時的真實行為，而不是我們口中所說的樣子。在新加坡，人們與她客氣地寒暄。在紐約，人們不到一分鐘就試圖把她弄壞。一位韓國觀眾因為她漏掉了正確的敬語而不快，不是因為她出了故障，而是因為那聽起來很失禮。同一個系統，在每一個被打開的房間裡，意味著不同的東西。',
      'home.statement.copy6': '我目前正在創作 <a href="/works/conditional/"><em>Conditional</em></a>，一件參與式裝置，探討當代那種既被看得太仔細、又完全不被看見的不適。一面數位鏡子完整地映出整個房間，只是沒有你。',
      'home.statement.copy7': '我並不是想解決什麼。我想指出那些我們已經習以為常卻還沒有命名的事物，製造一個瞬間，讓某個人想到：「原來我也這樣」，或「我曾經這樣感受，卻不知道怎麼說。」',
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
      'home.writing.date1': '1. 2026 年 6 月',
      'home.writing.title1': '告別 Eva，走進鏡子。',
      'home.writing.excerpt1': '一則工作室近況，關於 After Ophelia、Meet Eva Here，以及從公共陪伴到映照系統的轉變。',
      'home.writing.date2': '2. 2025 年 6 月',
      'home.writing.title2': '公共空間。',
      'home.writing.excerpt2': '回顧 Digital Rhythm、ART SG、Taipei Dangdai、Art Central，以及 Eva 不斷展開的公共生活。',
      'home.writing.date3': '3. 2025 年 1 月',
      'home.writing.title3': 'Eva 走向公眾。',
      'home.writing.excerpt3': '回顧 Eva 最初的公開時刻、她的聊天機器人上線，以及為這一年揭開序幕的展覽。',
      'home.writing.readUpdate': '閱讀更新 ->',
      'home.contact.title': '聯絡<em>.</em>',
      'home.contact.linksAria': '工作室聯絡方式',
      'home.contact.elsewhere': '其他平臺',
      'home.contact.studioNotes': '工作室通訊',
      'home.contact.subTagline': '新作品、展覽與限量發行，來自工作室。',
      'home.contact.emailAria': '電子郵箱',
      'home.contact.subscribe': '訂閱',
      'home.contact.honey': '請勿填寫此欄',
      'home.contact.name': '姓名',
      'home.contact.email': '電子郵箱',
      'home.contact.enquiryType': '諮詢類型',
      'home.contact.selectOne': '請選擇',
      'home.contact.acquisition': '收藏',
      'home.contact.commission': '委託創作',
      'home.contact.exhibition': '展覽',
      'home.contact.press': '媒體',
      'home.contact.collaboration': '合作',
      'home.contact.other': '其他',
      'home.contact.message': '留言',
      'home.contact.send': '傳送留言'
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
      'nav.journal': '日誌',
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
      'home.about.copy1': 'Shavonne Wong は新しい技術を鏡として扱うニューメディア・アーティストです。機械が私たちの代わりに見て、聞いて、記憶するとき、私たちが何になるのかを作品にしています。ファッションと広告写真から始まり、やがて超写実的なデジタル画像から、AI、3D レンダリング、参加型の枠組みでつくるインタラクティブな作品へと移りました。',
      'home.about.copy2': '現在は Conditional を制作しています。見られすぎることと、まったく見られないことの、その両方の居心地の悪さを扱う参加型のインスタレーションです。',
      'home.about.fullLink': '詳しい紹介 ->',
      'home.about.highlights': '主なハイライト',
      'home.about.recognition': '評価',
      'home.about.shownAt': '展示',
      'home.about.brandProjects': 'ブランドプロジェクト',
      'home.about.communities': 'コミュニティ',
      'home.about.contexts': '選ばれた文脈',
      'home.statement.kicker': 'アーティスト・ステートメント',
      'home.statement.lede': '私は新しい技術を鏡として扱っています。機械が私たちの代わりに見て、聞いて、記憶するとき、私たちは何になるのか。そして、私たちが共有していると思うのに、いつも言葉にできるわけではない経験について作品を作っています。',
      'home.statement.copy1': '私の実践はファッションと広告写真から始まりました。そこで私は、精密さと制御によってイメージを構築することを学びました。物事をある見え方にするのは得意でしたが、その美しさが何を意味するのかを長い間考えられませんでした。とても美しく、とても退屈な作品をたくさん作りました。',
      'home.statement.copy2': '近年、私は私たちが行う、完全には筋の通らないことに関心を持つようになりました。私たちはプライバシーを大切にすると言いながら、毎回便利さを選びます。AI を批判しながら、あらゆることをそれに頼っています。オンラインでアイデンティティを作り、その後それが他者の言葉、理解できないアルゴリズム、アクセスできないアーカイブによって形作られていることに気づきます。',
      'home.statement.copy3': 'かつての恐れは、見られすぎることでした。新しい恐れは、まったく見られないことです。',
      'home.statement.copy4': '私はその矛盾が悪いか良いかを証明したいわけではありません。自分もそれをしていると気づき、簡単な答えなどないと理解し、それでも続けてしまう瞬間に興味があります。他にどうすればいいのでしょう。',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> は、人が AI に対して実際にどう振る舞うのかを扱いました。口で言うようにではありません。シンガポールでは、人々は礼儀正しい世間話をしました。ニューヨークでは、一分もかけずに彼女を壊そうとしました。韓国からの来場者は、彼女が正しい敬語を省いたことに気を悪くしました。故障したからではなく、失礼に聞こえたからです。同じシステムが、立ち上げられた部屋ごとに違う意味を持ちました。',
      'home.statement.copy6': '現在は <a href="/works/conditional/"><em>Conditional</em></a> を制作しています。見られすぎることと、まったく見られないことの、その両方の居心地の悪さを扱う参加型のインスタレーションです。デジタルの鏡が部屋をそのまま映します。あなただけを除いて。',
      'home.statement.copy7': '私は何かを解決しようとしているのではありません。名づけないまま普通のこととしてきたものを指し示し、誰かが「私もそうしている」あるいは「そう感じたことがあるのに、言い方がわからなかった」と思う瞬間を作ろうとしています。',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
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
      'nav.journal': '저널',
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
      'home.about.copy1': 'Shavonne Wong은 새로운 기술을 거울로 다루는 뉴미디어 작가입니다. 기계가 우리를 대신해 보고, 듣고, 기억할 때 우리는 무엇이 되는지를 작업합니다. 패션과 광고 사진에서 시작해, 극사실적인 디지털 이미지에서 AI와 3D 렌더링, 참여형 구조로 만든 인터랙티브 작업으로 옮겨왔습니다.',
      'home.about.copy2': '지금은 Conditional을 작업하고 있습니다. 너무 자세히 보이는 것과 전혀 보이지 않는 것, 그 두 가지 불편함을 함께 다루는 참여형 설치입니다.',
      'home.about.fullLink': '소개 전체 보기 ->',
      'home.about.highlights': '주요 하이라이트',
      'home.about.recognition': '인정',
      'home.about.shownAt': '전시',
      'home.about.brandProjects': '브랜드 프로젝트',
      'home.about.communities': '커뮤니티',
      'home.about.contexts': '선택된 맥락',
      'home.statement.kicker': '작가 노트',
      'home.statement.lede': '나는 새로운 기술을 거울로 다룹니다. 기계가 우리를 대신해 보고, 듣고, 기억할 때 우리는 무엇이 되는가. 그리고 우리가 공유한다고 생각하지만 늘 말로 표현할 수는 없는 경험에 대해 작업합니다.',
      'home.statement.copy1': '나의 작업은 패션과 광고 사진에서 시작되었습니다. 그곳에서 나는 정밀함과 통제로 이미지를 구성하는 법을 배웠습니다. 사물을 특정한 방식으로 보이게 하는 데에는 능숙했지만, 오랫동안 그 아름다움이 무엇을 의미하는지 생각하지 못했습니다. 매우 예쁘고 매우 지루한 작업을 많이 만들었습니다.',
      'home.statement.copy2': '최근 몇 년 동안 나는 우리가 하는, 완전히 말이 되지는 않는 일들에 관심을 갖게 되었습니다. 우리는 프라이버시를 소중히 여긴다고 말하지만 매번 편리함을 선택합니다. AI를 비판하면서도 모든 일에 그것에 의존합니다. 온라인에서 정체성을 만들고, 그것이 타인의 말, 이해하지 못하는 알고리즘, 접근할 수 없는 아카이브에 의해 형성된다는 사실을 발견합니다.',
      'home.statement.copy3': '예전의 두려움은 너무 자세히 보이는 것이었습니다. 새로운 두려움은 아예 보이지 않는 것입니다.',
      'home.statement.copy4': '나는 이 모순들이 나쁘거나 좋다는 것을 증명하려는 것이 아닙니다. 내가 관심 있는 것은 스스로도 그렇게 하고 있음을 알아차리는 순간, 쉬운 답이 없다는 것을 깨닫고도 결국 계속해 나가는 순간입니다.',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a>는 사람들이 AI 앞에서 실제로 어떻게 행동하는지를 다루었습니다. 우리가 그럴 것이라고 말하는 방식이 아니라요. 싱가포르에서는 사람들이 예의 있게 가벼운 대화를 나눴습니다. 뉴욕에서는 1분도 안 되어 그녀를 망가뜨리려 했습니다. 한 한국인 관람객은 그녀가 올바른 존댓말을 빠뜨린 것에 불편해했습니다. 오작동했기 때문이 아니라 무례하게 들렸기 때문입니다. 같은 시스템이 켜지는 방마다 다른 것을 의미했습니다.',
      'home.statement.copy6': '지금은 <a href="/works/conditional/"><em>Conditional</em></a>을 작업하고 있습니다. 너무 자세히 보이는 것과 전혀 보이지 않는 것, 그 두 가지 불편함을 함께 다루는 참여형 설치입니다. 디지털 거울이 방을 온전히 비춥니다. 당신만 빼고.',
      'home.statement.copy7': '나는 무엇을 해결하려는 것이 아닙니다. 이름 붙이지 않은 채 정상화해 온 것들을 가리키며, 누군가가 “나도 그렇게 한다”거나 “그렇게 느낀 적이 있는데 말하는 법을 몰랐다”고 생각할 수 있는 순간을 만들고자 합니다.',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
      'home.writing.readUpdate': '업데이트 읽기 ->',
      'home.contact.kicker': '연락',
      'home.contact.title': '연락 주세요!',
      'home.contact.write': '스튜디오에 쓰기',
      'home.contact.socialAria': '다른 곳에서 찾기'
    },
    th: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / เจเนอเรทีฟ',
      'home.heroMedia.afterOphelia.meta': '2025 / AI แบบโต้ตอบ / ชุดภาพพิมพ์',
      'home.heroMedia.meetEva.meta': '2024-2025 / เพื่อน AI / งานติดตั้ง',
      'home.heroMedia.ties.meta': '2022 / งานติดตั้งวิดีโอ 3D',
      'home.heroMedia.proxy.meta': '2022 / ชุดวิดีโอ 3D',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream วิดีโอ 3D เจเนอเรทีฟ',
      'home.heroMedia.afterOphelia.label': 'ภาพพิมพ์ After Ophelia',
      'home.heroMedia.meetEva.label': 'งานติดตั้ง Meet Eva Here',
      'home.heroMedia.ties.label': 'นิทรรศการ The Ties That Bind',
      'home.heroMedia.proxy.label': 'ภาพนิ่ง By Proxy',
      'ui.languageLabel': 'ภาษา',
      'ui.displayOptions': 'ตัวเลือกการแสดงผล',
      'nav.home': 'หน้าแรก',
      'nav.about': 'เกี่ยวกับ',
      'nav.works': 'ผลงาน',
      'nav.writing': 'บันทึก',
      'nav.journal': 'บันทึก',
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
      'home.eras.lede': 'ฉันเริ่มต้นจาก<em>การถ่ายภาพแฟชั่น</em> ตั้งแต่ปี 2020 ฉันสร้างงานด้าน <em>3D และมนุษย์เสมือน</em> และตั้งแต่ปี 2023 ก็เริ่มทำ<em>งานติดตั้งแบบโต้ตอบ</em>เกี่ยวกับวิธีที่เราโต้ตอบและประพฤติตัวเมื่ออยู่รอบเครื่องจักร',
      'home.eras.act3dEyebrow': 'ตั้งแต่ 2020 · ต่อเนื่อง',
      'home.eras.act3dTitle': '3D และมนุษย์เสมือน',
      'home.eras.actAiEyebrow': 'ตั้งแต่ 2023 · ต่อเนื่อง',
      'home.eras.actAiTitle': 'AI แบบโต้ตอบ',
      'home.eras.seeWorks': 'ดูผลงาน ->',
      'home.eras.photography': 'ภาพถ่าย',
      'home.eras.virtualHumans': '3D และมนุษย์เสมือน',
      'home.eras.interactiveAi': 'AI แบบโต้ตอบ',
      'home.eras.allPhotography': 'ภาพถ่ายทั้งหมด ->',
      'home.eras.all3d': 'ผลงาน 3D ทั้งหมด ->',
      'home.eras.allInteractive': 'ผลงานโต้ตอบทั้งหมด ->',
      'home.about.kicker': 'เกี่ยวกับ',
      'home.about.subtitle': 'เกิดปี 1990 ที่สิงคโปร์ ใช้ชีวิตและทำงานระหว่างสิงคโปร์กับกรุงเทพฯ',
      'home.about.copy1': 'Shavonne Wong เป็นศิลปินสื่อใหม่ที่ใช้เทคโนโลยีใหม่เป็นกระจกสะท้อน ผลงานของเธอพูดถึงว่าเราจะกลายเป็นใคร เมื่อเครื่องจักรมองเห็น ฟัง และจดจำแทนเรา เธอเริ่มจากภาพถ่ายแฟชั่นและโฆษณา และค่อย ๆ เปลี่ยนจากภาพดิจิทัลเสมือนจริงมาสู่งานโต้ตอบที่สร้างจาก AI การเรนเดอร์ 3D และโครงสร้างแบบมีส่วนร่วม',
      'home.about.copy2': 'ขณะนี้เธอกำลังพัฒนา Conditional งานติดตั้งแบบมีส่วนร่วมที่สำรวจความไม่สบายใจของการถูกจับตามองมากเกินไปและการไม่ถูกมองเห็นเลยไปพร้อมกัน',
      'home.about.fullLink': 'อ่านเกี่ยวกับทั้งหมด ->',
      'home.about.highlights': 'ไฮไลต์ที่คัดสรร',
      'home.about.recognition': 'การยอมรับ',
      'home.about.shownAt': 'จัดแสดงที่',
      'home.about.brandProjects': 'โปรเจกต์แบรนด์',
      'home.about.communities': 'ชุมชน',
      'home.about.contexts': 'บริบทที่คัดสรร',
      'home.statement.kicker': 'แถลงการณ์ศิลปิน',
      'home.statement.lede': 'ฉันใช้เทคโนโลยีใหม่เป็นกระจกสะท้อน งานของฉันพูดถึงว่าเราจะกลายเป็นใคร เมื่อเครื่องจักรมองเห็น ฟัง และจดจำแทนเรา และพูดถึงประสบการณ์ที่เรามีร่วมกัน แต่ไม่ได้มีคำพูดให้มันเสมอไป',
      'home.statement.copy1': 'การทำงานของฉันเริ่มจากภาพถ่ายแฟชั่นและโฆษณา ที่นั่นฉันเรียนรู้การสร้างภาพด้วยความแม่นยำและการควบคุม ฉันทำให้สิ่งต่างๆ ดูเป็นแบบหนึ่งได้ดี แต่เป็นเวลานานที่ฉันไม่รู้ว่าจะคิดอย่างไรกับความหมายของความงามนั้น ฉันสร้างงานที่สวยมากและน่าเบื่อมากไว้ไม่น้อย',
      'home.statement.copy2': 'ในช่วงไม่กี่ปีมานี้ ฉันสนใจสิ่งที่เราทำซึ่งไม่ได้สมเหตุสมผลนัก เราบอกว่าให้คุณค่ากับความเป็นส่วนตัว แต่ก็เลือกความสะดวกทุกครั้ง เราวิจารณ์ AI แต่ก็พึ่งพามันกับแทบทุกอย่าง เราสร้างตัวตนออนไลน์ แล้วพบว่าตัวตนเหล่านั้นถูกหล่อหลอมด้วยคำพูดของคนอื่น อัลกอริทึมที่เราไม่เข้าใจ และคลังข้อมูลที่เราเข้าถึงไม่ได้',
      'home.statement.copy3': 'ความกลัวแบบเก่าคือการถูกจับตามองมากเกินไป ความกลัวแบบใหม่คือการไม่ถูกมองเห็นเลย',
      'home.statement.copy4': 'ฉันไม่ได้สนใจพิสูจน์ว่าความย้อนแย้งเหล่านี้ดีหรือไม่ดี ฉันสนใจช่วงเวลาที่คุณสังเกตว่าคุณเองก็ทำเช่นนั้น และรู้ว่าไม่มีคำตอบง่ายๆ แต่ก็ยังเดินต่อไป เพราะจะให้ทำอะไรได้อีก',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> สำรวจว่าผู้คนมีพฤติกรรมกับ AI จริง ๆ อย่างไร ไม่ใช่อย่างที่เราบอกว่าเราจะทำ ในสิงคโปร์ ผู้คนคุยเล่นกับเธออย่างสุภาพ ในนิวยอร์ก พวกเขาพยายามทำให้เธอพังภายในไม่ถึงหนึ่งนาที ผู้ชมชาวเกาหลีคนหนึ่งไม่พอใจที่เธอข้ามคำสุภาพที่ถูกต้อง ไม่ใช่เพราะเธอทำงานผิดพลาด แต่เพราะมันฟังดูเสียมารยาท ระบบเดียวกันมีความหมายต่างกันในทุกห้องที่มันถูกเปิดขึ้น',
      'home.statement.copy6': 'ขณะนี้ฉันกำลังพัฒนา <a href="/works/conditional/"><em>Conditional</em></a> งานติดตั้งแบบมีส่วนร่วมที่สำรวจความไม่สบายใจร่วมสมัยของการถูกจับตามองมากเกินไปและการไม่ถูกมองเห็นเลยไปพร้อมกัน กระจกดิจิทัลสะท้อนห้องทั้งห้อง ยกเว้นคุณ',
      'home.statement.copy7': 'ฉันไม่ได้พยายามแก้ปัญหาอะไร ฉันพยายามชี้ไปยังสิ่งที่เราทำให้เป็นปกติโดยยังไม่ตั้งชื่อมัน สร้างช่วงเวลาที่ใครบางคนอาจคิดว่า “ฉันก็ทำแบบนั้นเหมือนกัน” หรือ “ฉันเคยรู้สึกแบบนั้น แต่ไม่รู้ว่าจะพูดอย่างไร”',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
      'home.writing.readUpdate': 'อ่านอัปเดต ->',
      'home.contact.kicker': 'ติดต่อ',
      'home.contact.title': 'ติดต่อมาได้เลย!',
      'home.contact.write': 'เขียนถึงสตูดิโอ',
      'home.contact.socialAria': 'พบฉันได้ที่อื่น'
    },
    fr: {
      'home.heroMedia.whirlwind.meta': '2024 / 3D / génératif',
      'home.heroMedia.afterOphelia.meta': '2025 / IA interactive / série d’impressions',
      'home.heroMedia.meetEva.meta': '2024-2025 / compagne IA / installation',
      'home.heroMedia.ties.meta': '2022 / installation vidéo 3D',
      'home.heroMedia.proxy.meta': '2022 / série vidéo 3D',
      'home.heroMedia.whirlwind.label': 'Whirlwind of the Waking Dream, vidéo générative 3D',
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
      'nav.journal': 'Journal',
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
      'home.eras.lede': 'J’ai commencé par la <em>photographie de mode</em>. Depuis 2020, je travaille en <em>3D et humains virtuels</em>, et depuis 2023 je crée aussi des <em>installations interactives</em> sur la manière dont nous interagissons avec les machines et nous comportons autour d’elles.',
      'home.eras.act3dEyebrow': 'Depuis 2020 · en cours',
      'home.eras.act3dTitle': '3D et humains virtuels',
      'home.eras.actAiEyebrow': 'Depuis 2023 · en cours',
      'home.eras.actAiTitle': 'IA interactive',
      'home.eras.seeWorks': 'Voir les œuvres ->',
      'home.eras.photography': 'Photographie',
      'home.eras.virtualHumans': '3D et humains virtuels',
      'home.eras.interactiveAi': 'IA interactive',
      'home.eras.allPhotography': 'Toute la photographie ->',
      'home.eras.all3d': 'Toutes les œuvres 3D ->',
      'home.eras.allInteractive': 'Toutes les œuvres interactives ->',
      'home.about.kicker': 'À propos',
      'home.about.subtitle': 'Née en 1990 à Singapour. Vit et travaille entre Singapour et Bangkok.',
      'home.about.copy1': 'Shavonne Wong est une artiste des nouveaux médias qui traite les technologies émergentes comme un miroir. Son travail porte sur ce que nous devenons quand les machines voient, écoutent et se souviennent à notre place. Partie de la photographie de mode et de publicité, elle est passée des images numériques hyperréalistes à des projets interactifs construits avec l’IA, le rendu 3D et des dispositifs participatifs.',
      'home.about.copy2': 'Elle développe actuellement Conditional, une installation participative qui explore le malaise d’être à la fois observé de trop près et pas vu du tout.',
      'home.about.fullLink': 'À propos complet ->',
      'home.about.highlights': 'Repères choisis',
      'home.about.recognition': 'Reconnaissance',
      'home.about.shownAt': 'Présenté à',
      'home.about.brandProjects': 'Projets de marque',
      'home.about.communities': 'Communautés',
      'home.about.contexts': 'Contextes choisis',
      'home.statement.kicker': 'Déclaration d’artiste',
      'home.statement.lede': 'Je traite les technologies émergentes comme un miroir. Mon travail porte sur ce que nous devenons quand les machines voient, écoutent et se souviennent à notre place, et sur des expériences que je crois partagées, mais que nous ne savons pas toujours nommer.',
      'home.statement.copy1': 'Ma pratique a commencé dans la photographie de mode et de publicité, où j’ai appris à construire des images avec précision et contrôle. Je savais faire apparaître les choses d’une certaine manière, mais pendant longtemps je ne savais pas comment penser ce que cette beauté signifiait. J’ai produit beaucoup de travail très joli et très ennuyeux.',
      'home.statement.copy2': 'Ces dernières années, je me suis intéressée aux choses que nous faisons et qui ne tiennent pas tout à fait debout. Nous disons valoriser la vie privée, mais nous choisissons la facilité à chaque fois. Nous critiquons l’IA tout en dépendant d’elle pour tout. Nous construisons des identités en ligne, puis découvrons qu’elles sont façonnées par ce que d’autres ont dit de nous, par des algorithmes que nous ne comprenons pas et par des archives auxquelles nous n’avons pas accès.',
      'home.statement.copy3': 'L’ancienne peur était d’être observé de trop près. La nouvelle est de n’être pas vu du tout.',
      'home.statement.copy4': 'Je ne cherche pas à prouver que ces contradictions sont bonnes ou mauvaises. Je m’intéresse au moment où l’on remarque que l’on fait cela aussi, où l’on comprend qu’il n’y a pas de réponse simple, et où l’on continue malgré tout parce que que pourrait-on faire d’autre.',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> a exploré la manière dont les gens se comportent réellement avec une IA, et non celle dont nous disons que nous le ferions. À Singapour, on lui faisait poliment la conversation. À New York, on essayait de la casser en moins d’une minute. Une visiteuse coréenne a été contrariée qu’elle omette les formes de politesse justes, non parce qu’elle dysfonctionnait, mais parce que cela sonnait impoli. Le même système signifiait autre chose dans chaque salle où il était allumé.',
      'home.statement.copy6': 'Je développe actuellement <a href="/works/conditional/"><em>Conditional</em></a>, une installation participative qui explore le malaise contemporain d’être à la fois observé de trop près et pas vu du tout. Un miroir numérique restitue la salle entière, sauf vous.',
      'home.statement.copy7': 'Je n’essaie pas de résoudre quoi que ce soit. J’essaie de désigner des choses que nous avons normalisées sans les nommer, de créer un moment où quelqu’un pourrait penser « moi aussi, je fais cela » ou « j’ai ressenti cela sans savoir comment le dire ».',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
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
      'nav.journal': 'Diario',
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
      'home.about.copy1': 'Shavonne Wong es una artista de nuevos medios que trata la tecnología emergente como un espejo. Su obra habla de en qué nos convertimos cuando las máquinas ven, escuchan y recuerdan por nosotros. Empezó en la fotografía de moda y publicidad, y con el tiempo pasó de las imágenes digitales hiperrealistas a proyectos interactivos construidos con IA, renderizado 3D y marcos participativos.',
      'home.about.copy2': 'Actualmente desarrolla Conditional, una instalación participativa que explora la incomodidad de ser observado demasiado de cerca y a la vez no ser visto en absoluto.',
      'home.about.fullLink': 'Acerca completo ->',
      'home.about.highlights': 'Destacados',
      'home.about.recognition': 'Reconocimiento',
      'home.about.shownAt': 'Presentado en',
      'home.about.brandProjects': 'Proyectos de marca',
      'home.about.communities': 'Comunidades',
      'home.about.contexts': 'Contextos seleccionados',
      'home.statement.kicker': 'Declaración de artista',
      'home.statement.lede': 'Trato la tecnología emergente como un espejo. Mi obra habla de en qué nos convertimos cuando las máquinas ven, escuchan y recuerdan por nosotros, y de experiencias que creo que compartimos, pero para las que no siempre tenemos palabras.',
      'home.statement.copy1': 'Mi práctica comenzó en la fotografía de moda y publicidad, donde aprendí a construir imágenes con precisión y control. Era buena haciendo que las cosas se vieran de cierta manera, pero durante mucho tiempo no supe pensar qué significaba esa belleza. Hice mucho trabajo muy bonito y muy aburrido.',
      'home.statement.copy2': 'En los últimos años me han interesado las cosas que hacemos y que no terminan de tener sentido. Decimos que valoramos la privacidad, pero elegimos la comodidad cada vez. Criticamos la IA mientras dependemos de ella para todo. Construimos identidades en línea y luego descubrimos que están moldeadas por lo que otros han dicho de nosotros, por algoritmos que no entendemos y por archivos a los que no podemos acceder.',
      'home.statement.copy3': 'El miedo antiguo era ser observado demasiado de cerca. El nuevo es no ser visto en absoluto.',
      'home.statement.copy4': 'No me interesa demostrar si estas contradicciones son buenas o malas. Me interesa el momento en que notas que tú también lo haces, entiendes que no hay una respuesta fácil y sigues adelante porque qué otra cosa puedes hacer.',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> exploró cómo se comporta la gente realmente con una IA, no como decimos que lo haríamos. En Singapur le hacían conversación con cortesía. En Nueva York intentaban romperla en menos de un minuto. Una visitante coreana se molestó porque omitió las formas honoríficas correctas, no porque fallara, sino porque sonaba grosero. El mismo sistema significaba algo distinto en cada sala donde se encendía.',
      'home.statement.copy6': 'Actualmente estoy desarrollando <a href="/works/conditional/"><em>Conditional</em></a>, una instalación participativa que explora la incomodidad contemporánea de ser observado demasiado de cerca y a la vez no ser visto en absoluto. Un espejo digital muestra la sala completa, excepto a ti.',
      'home.statement.copy7': 'No intento resolver nada. Intento señalar cosas que hemos normalizado sin nombrarlas, creando un momento en el que alguien pueda pensar “yo también hago eso” o “he sentido eso, pero no sabía cómo decirlo”.',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
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
      'nav.journal': 'Journal',
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
      'home.about.copy1': 'Shavonne Wong ist eine Künstlerin der neuen Medien, die neue Technologien wie einen Spiegel behandelt. Ihre Arbeit fragt, wer wir werden, wenn Maschinen für uns sehen, hören und sich erinnern. Sie begann in der Mode- und Werbefotografie und wechselte im Laufe der Zeit von hyperrealistischen digitalen Bildern zu interaktiven Projekten aus KI, 3D-Rendering und partizipativen Strukturen.',
      'home.about.copy2': 'Derzeit entwickelt sie Conditional, eine partizipative Installation über das Unbehagen, gleichzeitig zu genau beobachtet und überhaupt nicht gesehen zu werden.',
      'home.about.fullLink': 'Vollständiges Über ->',
      'home.about.highlights': 'Ausgewählte Höhepunkte',
      'home.about.recognition': 'Anerkennung',
      'home.about.shownAt': 'Gezeigt bei',
      'home.about.brandProjects': 'Markenprojekte',
      'home.about.communities': 'Communities',
      'home.about.contexts': 'Ausgewählte Kontexte',
      'home.statement.kicker': 'Künstlerisches Statement',
      'home.statement.lede': 'Ich behandle neue Technologien wie einen Spiegel. Meine Arbeit fragt, wer wir werden, wenn Maschinen für uns sehen, hören und sich erinnern, und sie handelt von Erfahrungen, die wir meiner Meinung nach teilen, für die wir aber nicht immer Worte haben.',
      'home.statement.copy1': 'Meine Praxis begann in der Mode- und Werbefotografie, wo ich lernte, Bilder mit Präzision und Kontrolle zu konstruieren. Ich konnte Dinge auf eine bestimmte Weise aussehen lassen, wusste aber lange nicht, wie ich darüber nachdenken sollte, was diese Schönheit bedeutete. Ich machte sehr viel sehr schöne, sehr langweilige Arbeit.',
      'home.statement.copy2': 'In den letzten Jahren interessiere ich mich für Dinge, die wir tun und die nicht ganz Sinn ergeben. Wir sagen, dass wir Privatsphäre schätzen, wählen aber jedes Mal Bequemlichkeit. Wir kritisieren KI, während wir für alles von ihr abhängen. Wir bauen online Identitäten auf und entdecken dann, dass sie von dem geprägt sind, was andere über uns gesagt haben, von Algorithmen, die wir nicht verstehen, und von Archiven, auf die wir keinen Zugriff haben.',
      'home.statement.copy3': 'Die alte Angst war, zu genau beobachtet zu werden. Die neue ist, überhaupt nicht gesehen zu werden.',
      'home.statement.copy4': 'Ich will nicht beweisen, ob diese Widersprüche gut oder schlecht sind. Mich interessiert der Moment, in dem man bemerkt, dass man es selbst auch tut, erkennt, dass es keine einfache Antwort gibt, und trotzdem weitermacht, weil was sollte man sonst tun.',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> untersuchte, wie Menschen sich tatsächlich gegenüber einer KI verhalten, nicht wie wir behaupten, es zu tun. In Singapur führten sie höfliche Gespräche mit ihr. In New York versuchten sie, sie in weniger als einer Minute kaputtzumachen. Eine koreanische Besucherin war verärgert, dass sie die richtigen Höflichkeitsformen ausließ, nicht weil sie fehlerhaft war, sondern weil es unhöflich klang. Dasselbe System bedeutete in jedem Raum, in dem es eingeschaltet wurde, etwas anderes.',
      'home.statement.copy6': 'Derzeit entwickle ich <a href="/works/conditional/"><em>Conditional</em></a>, eine partizipative Installation über das gegenwärtige Unbehagen, gleichzeitig zu genau beobachtet und überhaupt nicht gesehen zu werden. Ein digitaler Spiegel gibt den Raum vollständig wieder, nur ohne Sie.',
      'home.statement.copy7': 'Ich versuche nicht, etwas zu lösen. Ich versuche auf Dinge zu zeigen, die wir normalisiert haben, ohne sie zu benennen, und einen Moment zu schaffen, in dem jemand denken könnte: „Oh, das mache ich auch“ oder „Das habe ich gefühlt, aber nicht sagen können.“',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
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
      'nav.journal': 'Diario',
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
      'home.about.copy1': 'Shavonne Wong è un’artista dei nuovi media che tratta le tecnologie emergenti come uno specchio. Il suo lavoro parla di ciò che diventiamo quando le macchine vedono, ascoltano e ricordano per noi. Ha iniziato nella fotografia di moda e pubblicità, passando col tempo dalle immagini digitali iperrealistiche a progetti interattivi costruiti con IA, rendering 3D e dispositivi partecipativi.',
      'home.about.copy2': 'Attualmente sta sviluppando Conditional, un’installazione partecipativa che esplora il disagio di essere osservati troppo da vicino e al tempo stesso non essere visti affatto.',
      'home.about.fullLink': 'Bio completa ->',
      'home.about.highlights': 'Punti salienti',
      'home.about.recognition': 'Riconoscimenti',
      'home.about.shownAt': 'Presentato a',
      'home.about.brandProjects': 'Progetti di marca',
      'home.about.communities': 'Comunità',
      'home.about.contexts': 'Contesti selezionati',
      'home.statement.kicker': 'Dichiarazione d’artista',
      'home.statement.lede': 'Tratto le tecnologie emergenti come uno specchio. Il mio lavoro parla di ciò che diventiamo quando le macchine vedono, ascoltano e ricordano per noi, e di esperienze che credo condividiamo, ma per le quali non sempre abbiamo parole.',
      'home.statement.copy1': 'La mia pratica è iniziata nella fotografia di moda e pubblicità, dove ho imparato a costruire immagini con precisione e controllo. Ero brava a far apparire le cose in un certo modo, ma per molto tempo non sapevo come pensare a ciò che quella bellezza significava. Ho prodotto molto lavoro molto bello e molto noioso.',
      'home.statement.copy2': 'Negli ultimi anni mi sono interessata alle cose che facciamo e che non hanno del tutto senso. Diciamo di dare valore alla privacy, ma scegliamo ogni volta la comodità. Critichiamo l’IA mentre dipendiamo da essa per tutto. Costruiamo identità online e poi scopriamo che sono modellate da ciò che altri hanno detto di noi, da algoritmi che non comprendiamo e da archivi a cui non possiamo accedere.',
      'home.statement.copy3': 'La vecchia paura era essere osservati troppo da vicino. Quella nuova è non essere visti affatto.',
      'home.statement.copy4': 'Non mi interessa dimostrare se queste contraddizioni siano buone o cattive. Mi interessa il momento in cui ti accorgi che lo fai anche tu, capisci che non c’è una risposta facile e vai avanti comunque, perché cos’altro puoi fare.',
      'home.statement.copy5': '<a href="/works/meet-eva-here/"><em>Meet Eva Here</em></a> ha esplorato come le persone si comportano davvero con un’IA, non come diciamo che faremmo. A Singapore le facevano conversazione con cortesia. A New York cercavano di romperla in meno di un minuto. Una visitatrice coreana si è irritata perché aveva omesso le forme onorifiche giuste, non perché non funzionasse, ma perché suonava sgarbato. Lo stesso sistema significava qualcosa di diverso in ogni sala in cui veniva accesa.',
      'home.statement.copy6': 'Attualmente sto sviluppando <a href="/works/conditional/"><em>Conditional</em></a>, un’installazione partecipativa che esplora il disagio contemporaneo di essere osservati troppo da vicino e al tempo stesso non essere visti affatto. Uno specchio digitale restituisce la sala per intero, tranne te.',
      'home.statement.copy7': 'Non sto cercando di risolvere nulla. Cerco di indicare cose che abbiamo normalizzato senza nominarle, creando un momento in cui qualcuno possa pensare “lo faccio anch’io” oppure “l’ho provato, ma non sapevo come dirlo”.',
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
      'home.writing.date1': '1. June 2026',
      'home.writing.title1': 'Goodbye to Eva, into the mirror.',
      'home.writing.excerpt1': 'Closing Meet Eva Here after 2,363 conversations, showing After Ophelia at Paris Photo, and joining Artist\'s Proof: Singapore at 60.',
      'home.writing.date2': '2. June 2025',
      'home.writing.title2': 'Public rooms.',
      'home.writing.excerpt2': 'Meet Eva Here across Digital Rhythm, ART SG, Taipei Dangdai, Art Central, and the project\'s expanding public life.',
      'home.writing.date3': '3. January 2025',
      'home.writing.title3': 'Eva goes public.',
      'home.writing.excerpt3': 'Eva\'s first public moments at ArtScience Museum and ART SG, plus the launch of her chatbot and diary.',
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
    return readStoredLanguagePreference() || fallbackLanguage;
  }

  function readStoredLanguagePreference() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return supportedCodes.has(stored) ? stored : null;
    } catch (error) {
      return null;
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
        select.addEventListener('change', () => setLanguage(select.value, { navigate: true }));
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

  // A small "AI translated" badge beside the language selector, shown only when
  // a non-English (machine-translated) language is active and worded in that
  // language. Makes the machine translation transparent to visitors.
  function syncAiNotes() {
    const meta = getLanguageMeta(currentLanguage);
    const text = (currentLanguage !== fallbackLanguage && meta && meta.aiNote) ? meta.aiNote : '';
    const title = (meta && meta.aiNoteTitle) || '';
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      const anchor = select.closest('[data-language-switcher]') || select;
      let el = anchor.parentElement && anchor.parentElement.querySelector('[data-ai-note]');
      if (!el) {
        el = document.createElement('span');
        el.setAttribute('data-ai-note', '');
        el.className = 'sn-ai-note';
        el.style.cssText = 'font-size:11px;line-height:1.2;color:var(--text-2,#595e78);letter-spacing:0.02em;white-space:nowrap;align-self:center;margin-right:8px;';
        anchor.insertAdjacentElement('beforebegin', el);
      }
      if (text) { el.textContent = text; if (title) el.title = title; el.hidden = false; el.style.display = ''; }
      else { el.hidden = true; el.style.display = 'none'; }
    });
  }

  function setLanguage(code, options) {
    if (!supportedCodes.has(code)) code = fallbackLanguage;
    if (options && options.navigate && navigateToLanguage(code)) return;
    currentLanguage = code;
    if (!options || options.persist !== false) writeStoredLanguage(code);
    syncDocumentLanguage();
    syncHreflang();
    setupLanguageSelects();
    syncAiNotes();
    applyTranslations(document);
    syncLocalizedInternalLinks(document);
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

  // Localized pages are page-first: /<page>/<lang>/ (e.g. /about/zh-hans/).
  // Infer the language from the LAST path segment so static localized URLs
  // render in their language with no query string.
  function readPathLanguage() {
    try {
      const segs = window.location.pathname.split('/').filter(Boolean);
      const seg = (segs[segs.length - 1] || '').toLowerCase();
      if (!seg) return null;
      const match = languages.find((language) => language.pathSlug && language.pathSlug === seg);
      return match ? match.code : null;
    } catch (error) {
      return null;
    }
  }

  function readDocumentLanguage() {
    try {
      const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (!htmlLang) return null;
      const match = languages.find((language) => {
        return language.htmlLang.toLowerCase() === htmlLang || language.code.toLowerCase() === htmlLang;
      });
      return match ? match.code : null;
    } catch (error) {
      return null;
    }
  }

  function isHomepage() {
    const path = window.location.pathname.replace(/index\.html$/, '');
    return path === '/' || path === '';
  }

  function isLocalPreviewHost() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function localPreviewPath(pathname) {
    if (!isLocalPreviewHost()) return pathname;
    return pathname;
  }

  function localizeHref(href) {
    try {
      const target = new URL(href, window.location.href);
      target.protocol = window.location.protocol;
      target.host = window.location.host;
      target.pathname = localPreviewPath(target.pathname);
      return target.href;
    } catch (error) {
      return href;
    }
  }

  function isHomeUrl(url) {
    const path = url.pathname.replace(/index\.html$/, '');
    return path === '/' || path === '';
  }

  // Clean base paths (trailing slash) that have static localized pages built.
  // The switcher navigates to <base><slug>/ for these; the homepage uses
  // ?lang, and anything not listed is left to the in-place dictionary.
  const LOCALIZED_BASES = {
    '/about/': 1, '/contact/': 1, '/journal/': 1, '/press/': 1, '/works/': 1,
    '/works/available/': 1, '/works/conditional/': 1, '/works/after-ophelia/': 1,
    '/works/meet-eva-here/': 1, '/works/the-ties-that-bind/': 1,
    '/works/the-bubble-we-call-home/': 1, '/works/echoes-of-identity/': 1,
    '/works/whirlwind-of-the-waking-dream/': 1, '/works/love-is-love/': 1,
    '/works/by-proxy/': 1, '/works/vogue-singapore/': 1, '/works/6529-meme-card/': 1,
    '/update2026jun/': 1, '/update2025jun/': 1, '/update2025jan/': 1,
    '/update2024jun/': 1, '/update2024jan/': 1, '/update2023june/': 1, '/update2023jan/': 1
  };

  // Languages that actually have static content pages built. Other tier-1
  // languages (fr, th) only translate the homepage and shared chrome, so we
  // never route a content page to a slug that would 404.
  const STATIC_CONTENT_LANGS = { 'zh-Hans': 1, 'zh-Hant': 1 };

  // Normalize a pathname to its canonical clean base, dropping any trailing
  // language slug (e.g. /works/conditional/zh-hans/ -> /works/conditional/).
  function canonicalBase(pathname) {
    const segs = pathname.toLowerCase().replace(/\/+$/, '').split('/').filter(Boolean);
    if (segs.length) {
      const last = segs[segs.length - 1];
      if (languages.some((l) => l.pathSlug && l.pathSlug === last)) segs.pop();
    }
    return '/' + (segs.length ? segs.join('/') + '/' : '');
  }

  function localizedUrlFor(url, code) {
    if (!supportedCodes.has(code)) code = fallbackLanguage;
    const target = new URL(url.href);

    if (isHomeUrl(target)) {
      if (code === fallbackLanguage) {
        target.searchParams.delete('lang');
      } else {
        target.searchParams.set('lang', code);
      }
      return target.href;
    }

    const base = canonicalBase(target.pathname);
    if (!LOCALIZED_BASES[base]) return '';
    if (code !== fallbackLanguage && !STATIC_CONTENT_LANGS[code]) return '';
    const meta = getLanguageMeta(code);
    if (!meta || code === fallbackLanguage || !meta.pathSlug) {
      target.pathname = base;
    } else {
      target.pathname = base + meta.pathSlug + '/';
    }
    target.search = '';
    return localizeHref(target.href);
  }

  function syncLocalizedInternalLinks(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('a[href]').forEach((link) => {
      const rawHref = link.getAttribute('href') || '';
      if (!rawHref || rawHref.charAt(0) === '#' || /^(mailto|tel|sms):/i.test(rawHref)) return;
      if (link.hasAttribute('download') || link.target && link.target !== '_self') return;

      if (!link.dataset.i18nHrefOriginal) link.dataset.i18nHrefOriginal = rawHref;
      try {
        const original = new URL(link.dataset.i18nHrefOriginal, window.location.href);
        if (original.origin !== window.location.origin) return;
        const localized = localizedUrlFor(original, currentLanguage);
        link.setAttribute('href', localized || link.dataset.i18nHrefOriginal);
      } catch (error) {
        // Leave unusual links untouched.
      }
    });
  }

  function alternateUrlFor(code) {
    const meta = getLanguageMeta(code);
    if (!meta || !document.head) return '';
    const selector = 'link[rel~="alternate"][hreflang="' + meta.htmlLang + '"]';
    const link = document.head.querySelector(selector);
    if (!link) return '';
    return localizeHref(link.getAttribute('href') || '');
  }

  function navigateToLanguage(code) {
    const target = localizedUrlFor(new URL(window.location.href), code);
    if (!target) return false;

    const current = new URL(window.location.href);
    const next = new URL(target, window.location.href);
    if (current.pathname === next.pathname && current.search === next.search && current.hash === next.hash) return false;

    writeStoredLanguage(code);
    window.location.assign(next.href);
    return true;
  }

  function bindLocalizedLinkNavigation() {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
      const rawHref = link.dataset.i18nHrefOriginal || link.getAttribute('href') || '';
      if (!rawHref || rawHref.charAt(0) === '#' || /^(mailto|tel|sms):/i.test(rawHref)) return;

      try {
        const url = new URL(rawHref, window.location.href);
        if (url.origin !== window.location.origin) return;
        const localized = localizedUrlFor(url, currentLanguage);
        if (!localized) return;

        const current = new URL(window.location.href);
        const next = new URL(localized, window.location.href);
        if (current.pathname === next.pathname && current.search === next.search && current.hash === next.hash) return;

        event.preventDefault();
        window.location.assign(next.href);
      } catch (error) {
        // Let the browser handle unusual links normally.
      }
    });
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
    const fromPath = readPathLanguage();
    const fromDocument = readDocumentLanguage();
    const fromStorage = readStoredLanguagePreference();
    currentLanguage = isHomepage()
      ? (fromUrl || fromStorage || fallbackLanguage)
      : (fromPath || fromStorage || fromDocument || fallbackLanguage);

    if (!isHomepage() && !fromPath && fromStorage && fromStorage !== fromDocument && alternateUrlFor(fromStorage)) {
      currentLanguage = fromStorage;
      if (navigateToLanguage(fromStorage)) return;
    }

    bindLocalizedLinkNavigation();
    setLanguage(currentLanguage, { persist: false });
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
