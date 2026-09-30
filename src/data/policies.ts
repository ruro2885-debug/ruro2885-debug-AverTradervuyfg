export interface PolicySection {
  id: string;
  number: string;
  title: string;
  content: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  lastUpdated: string;
  introduction: string;
  sections: PolicySection[];
  contactEmail: string;
  officeAddress: string;
}

export const policyDocuments: PolicyDocument[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'July 4, 2026',
    introduction: 'Welcome to Aver. These Terms of Service ("Terms") govern your access to and use of the website, mobile applications, platform ecosystem, proprietary interfaces, and algorithmic software provided by Aver Technologies ("Company", "we", "us", or "our"). By registering an account, clicking "Create Account", or utilizing our interfaces, you enter into a legally binding agreement and agree to comply with all aspects of these Terms.',
    contactEmail: 'legal@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'tos-sec-1',
        number: '1',
        title: 'Agreement and Acceptance of Terms',
        content: 'By accessing or utilizing our services, you affirm that you are at least 18 years of age (or the legal age of majority in your jurisdiction) and possess the full legal capacity to enter into these Terms. If you do not agree to these Terms, or if your jurisdiction prohibits algorithmic simulation platforms, you are strictly prohibited from accessing, creating, or using the Aver platform.'
      },
      {
        id: 'tos-sec-2',
        number: '2',
        title: 'Account Security and Access Protocols',
        content: 'To safeguard your platform interactions, Aver utilizes local secure cryptographic isolation. You are solely responsible for maintaining the absolute confidentiality of your local keys, Client Username, and password. You agree to accept full responsibility for all activities, trade triggers, and system interactions performed under your registered account. Aver Technologies will not be liable for any losses arising from compromised client credentials.'
      },
      {
        id: 'tos-sec-3',
        number: '3',
        title: 'AI Trading Execution & Precision Entry Optimizer (PEO™)',
        content: 'Aver integrates the AverCore AI™ engine and the Precision Entry Optimizer™ (PEO™) to simulate high-frequency algorithmic trade executions. These systems rely on advanced neural network telemetry. All output signals, analytical predictions, and automatic executions are generated based on mathematical calculations and historical models. You acknowledge that AI trading involves inherent model inaccuracies, data delays, and architectural risks.'
      },
      {
        id: 'tos-sec-4',
        number: '4',
        title: 'Real-Money Trading Environment',
        content: 'The AVER Platform provides real-money financial services. Account balances, deposits, withdrawals, capital allocations, trading activity, gains, and losses displayed within the platform represent real financial activity where applicable and are not presented as simulated or virtual monetary value.\n\nAll transactions and account activity are subject to the applicable terms, verification requirements, processing procedures, and platform policies.\n\nTrading and financial markets involve risk. The value of an account or trading position can increase or decrease, and losses can occur, including the potential loss of deposited or allocated funds. Past performance does not guarantee future results.\n\nUsers should review all applicable risk disclosures and platform terms before depositing funds or initiating trading activity.'
      },
      {
        id: 'tos-sec-5',
        number: '5',
        title: 'Limitation of Liability & No Warranty',
        content: 'Aver Technologies provides the platform on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. To the maximum extent permitted by applicable law, in no event shall Aver Technologies, its subsidiaries, affiliates, or employees be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from platform downtime, service interruptions, or model execution failures.'
      },
      {
        id: 'tos-sec-6',
        number: '6',
        title: 'User Obligations and Acceptable Use Policy',
        content: 'You agree not to modify, reverse-engineer, exploit, or launch denial-of-service (DoS) attacks against the Aver server nodes or decentralized telemetry feeds. You will not utilize automated bots to extract raw telemetry data for competitive redistribution. Violation of these obligations will result in immediate termination of your platform authorization and potential civil or criminal prosecution.'
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'July 4, 2026',
    introduction: 'At Aver Technologies, we prioritize the protection of your personal information and market telemetry data. This Privacy Policy details the protocols we utilize to gather, store, process, and secure client information when you interact with the Aver platform, client terminals, and predictive analytics tools.',
    contactEmail: 'privacy@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'priv-sec-1',
        number: '1',
        title: 'Data Collection Protocols',
        content: 'We collect information you explicitly provide during account creation, including your First Name, Last Name, Email Address, and secure hashed password credentials. Additionally, our nodes automatically capture technical device metadata, localized network telemetry (IP address, operating system, browser configurations), and user-interaction logs with our visual mockups.'
      },
      {
        id: 'priv-sec-2',
        number: '2',
        title: 'How We Use Collected Information',
        content: 'Collected data is primarily utilized to: (a) Authenticate user sessions securely, (b) Calibrate user interface preferences including local language (EN, ES, ZH, DE, FR) and default display currency, (c) Optimize the local response speed of the Precision Entry Optimizer (PEO™), and (d) Audit system security against malicious telemetry injections.'
      },
      {
        id: 'priv-sec-3',
        number: '3',
        title: 'Decentralized Storage & Security Controls',
        content: 'Aver adheres to zero-knowledge architectural guidelines. Sensative password credentials are immediately encrypted using robust industry-standard hashing algorithms (bcrypt/Argon2) prior to storage. All sandbox preferences reside within isolated secure database records. We implement multiple security layers, including Transport Layer Security (TLS 1.3), automated IP threat mitigation, and rigid role-based query policies.'
      },
      {
        id: 'priv-sec-4',
        number: '4',
        title: 'Cookies & Active Telemetry Tracking',
        content: 'We employ essential local storage tokens and cookies to maintain active browser sessions, verify authentication states, and persist client interface settings (e.g., dark vs. light theme configuration) across tabs. These cookies are non-invasive and contain no unencrypted personally identifiable information.'
      },
      {
        id: 'priv-sec-5',
        number: '5',
        title: 'User Privacy Rights (GDPR & CCPA Compliant)',
        content: 'Under applicable international data protections (such as the General Data Protection Regulation and the California Consumer Privacy Act), you possess the right to: (a) Access your stored profile dataset, (b) Request rectification of inaccurate fields, (c) Command complete erasure of your credentials and sandbox states, and (d) Restrict certain automated telemetry processing logs.'
      },
      {
        id: 'priv-sec-6',
        number: '6',
        title: 'International Data Transfers',
        content: 'Aver operates on globally distributed, high-performance container clusters. By registering an account, you acknowledge and agree that your encrypted account profile and system logs may be transferred to, and processed in, secure facilities located outside of your resident country.'
      }
    ]
  },
  {
    id: 'cookie',
    title: 'Cookie Policy',
    lastUpdated: 'July 4, 2026',
    introduction: 'This Cookie Policy explains how Aver Technologies uses cookies, local storage items, and related telemetry trackers on the Aver platform. It details why we utilize these tracking mechanisms and your rights to manage or disable their integration.',
    contactEmail: 'cookies@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'cook-sec-1',
        number: '1',
        title: 'Cookie Infrastructure and Purpose',
        content: 'Cookies are small text records downloaded directly onto your local browser filesystem when you load specific web platforms. Aver employs these cookies to: (a) Assure seamless navigation across different platform states (e.g. Hero, Platform Showcase, User Authentication), (b) Save local configurations without requiring constant server round-trips, and (c) Prevent cross-site request forgery (CSRF) vulnerabilities.'
      },
      {
        id: 'cook-sec-2',
        number: '2',
        title: 'Types of Cookies Utilized on Aver',
        content: 'We classify our telemetry cookies into three primary groups: (1) Strictly Essential Cookies: Necessary for maintaining core platform access, secure login tokens, and anti-fraud filters. (2) Preference & Interface Cookies: Used to save your active theme selections (dark/light), locale index, and sandbox display currency. (3) Analytics Cookies: Anonymized interaction monitors that help us trace performance delays and load balancing efficiency.'
      },
      {
        id: 'cook-sec-3',
        number: '3',
        title: 'Essential Local Storage vs. Session Keys',
        content: 'In addition to standard cookies, Aver leverages the HTML5 Local Storage API to store large, persistent interface preferences (e.g. active analytics panels, charts layout states). These elements do not expire at the end of the browser session and remain fully isolated to the Aver domain.'
      },
      {
        id: 'cook-sec-4',
        number: '4',
        title: 'Analytics and Performance Telemetry',
        content: 'We run high-frequency log trackers to aggregate server load factors and interface responsive latencies. This analysis is fully anonymized. We never compile or correlate cookie data with real-world geographical coordinates or external financial bank identities.'
      },
      {
        id: 'cook-sec-5',
        number: '5',
        title: 'Cookie Preference Management',
        content: 'Most modern web browsers are pre-configured to accept cookies automatically. You can alter your browser settings to reject cookies, prompt you before acceptance, or manually clear your local storage cache. Note that disabling essential cookies will completely disrupt user authentication and prevent the Aver platform from initializing.'
      }
    ]
  },
  {
    id: 'risk',
    title: 'Risk Disclosure',
    lastUpdated: 'July 4, 2026',
    introduction: 'ENGAGING IN ALGORITHMIC, HIGH-FREQUENCY, OR AI-ASSISTED ASSET TRADING INVOLVES CRITICAL RISK. This Risk Disclosure Statement serves as a rigorous notice of the substantial financial and operational hazards associated with utilizing automated software, quantitative models, and neural network engines like Aver Technologies.',
    contactEmail: 'compliance@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'risk-sec-1',
        number: '1',
        title: 'High-Risk Algorithmic Trading Notice',
        content: 'Automated asset trading, cryptocurrency operations, and leverage strategies represent highly complex financial ecosystems. Sharp, volatile swings can occur within microseconds. Executing trades via algorithmic systems amplifies the potential for rapid capital depletion.'
      },
      {
        id: 'risk-sec-2',
        number: '2',
        title: 'Live Market Environment & Trading Reality',
        content: 'All live trading activity conducted through the AVER Platform is based on real market conditions and real financial activity. Trade execution, account balances, capital allocations, gains, losses, and related performance metrics reflect actual activity associated with the user’s account where applicable.\n\nMarket conditions can change rapidly. Execution prices, liquidity, spreads, market volatility, network conditions, exchange availability, and execution latency may affect the outcome of individual trades.\n\nAVER’s analytical, algorithmic, and AI-assisted systems are designed to process available market information and support trading activity. However, no system can eliminate market risk or guarantee a particular trading outcome.\n\nHistorical data, backtesting, demonstrations, and illustrative performance examples may be used to explain platform functionality. Such information should not be interpreted as a guarantee of future performance.'
      },
      {
        id: 'risk-sec-3',
        number: '3',
        title: 'Technical Execution & System Interruption Risks',
        content: 'Algorithmic software is vulnerable to specialized technical faults. These include: (a) API key disconnection between the user and exchanges, (b) Cloud hosting server nodes downtime, (c) Corrupted decentralized telemetry data feeds, and (d) Internal model calculation errors. You accept all consequences of such automated execution interruptions.'
      },
      {
        id: 'risk-sec-4',
        number: '4',
        title: 'No Financial Advice Warranty',
        content: 'Aver Technologies, including the AverCore AI™ assistant, does not provide personal financial, tax, or investment advice. All generated signals, risk levels, and system indicators are automated analytical summaries. Clients are advised to seek independent certified financial counsel before placing physical assets on automated trade routes.'
      },
      {
        id: 'risk-sec-5',
        number: '5',
        title: 'Market Volatility and Disruption Events',
        content: 'System failures, severe network disruptions, exchange halts, rapid fork deployments, regulatory freeze interventions, or catastrophic liquidity drops can occur unexpectedly. During such disruption events, quantitative models may behave unpredictably, compounding loss speed.'
      }
    ]
  },
  {
    id: 'aml',
    title: 'AML & KYC Policy',
    lastUpdated: 'July 4, 2026',
    introduction: 'Aver Technologies is committed to maintaining the highest global standards of regulatory compliance, integrity, and safety. This Anti-Money Laundering (AML) and Know Your Customer (KYC) Policy defines the frameworks we implement to detect, mitigate, and prevent our platform from being used for illicit financial activities, money laundering, or terrorist financing.',
    contactEmail: 'kyc-compliance@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'aml-sec-1',
        number: '1',
        title: 'Identity Verification Framework (KYC)',
        content: 'In accordance with global AML guidance, we mandate that any client transitioning from virtual sandbox simulation to real asset connections complete a multi-tiered KYC process. This involves verifying: (a) Legal full name, (b) Date of birth, (c) Physical address via utility proof, and (d) Government-issued photo identification. Verification is managed using industry-standard compliant partners.'
      },
      {
        id: 'aml-sec-2',
        number: '2',
        title: 'Anti-Money Laundering Protocols (AML)',
        content: 'Aver implements rigid algorithmic audits to scan for structured deposits, rapid capital cycling across multiple addresses, or integrations with blacklisted decentralized smart contracts. Any identified suspicious behaviors will trigger immediate account lockouts, detailed investigations, and reports to relevant national financial intelligence divisions.'
      },
      {
        id: 'aml-sec-3',
        number: '3',
        title: 'Source of Funds and Asset Verification Standards',
        content: 'Clients are required to verify the legal source of all active trade capital. Aver prohibits the connection of accounts associated with mixers, privacy-enhancing protocol nodes, or unverified peer-to-peer (P2P) brokers. Any funds originating from suspect sources will be isolated pending formal verification.'
      },
      {
        id: 'aml-sec-4',
        number: '4',
        title: 'Continuous Account Monitoring',
        content: 'Our compliance department runs active monitoring tools on client trading behaviors. We audit parameters such as unexpected trading volume spikes, high frequency connections from distinct geographical IPs within short intervals, and transfers to unverified external deposit wallets.'
      },
      {
        id: 'aml-sec-5',
        number: '5',
        title: 'Sanctions and Geographical Exclusions',
        content: 'Aver does not provide services to individuals or entities listed on international sanctions registers, including those of the US Office of Foreign Assets Control (OFAC), the United Nations Security Council, and the European Union. Furthermore, the platform is restricted in certain jurisdictions, including but not limited to North Korea, Iran, Syria, and Cuba.'
      }
    ]
  },
  {
    id: 'electronic',
    title: 'Electronic Communications Agreement',
    lastUpdated: 'July 4, 2026',
    introduction: 'This Electronic Communications Agreement ("Agreement") outlines your consent to receive all notices, disclosures, system statements, and platform updates electronically. By creating an account on Aver, you agree that all communications from Aver Technologies are legally equivalent to paper documents.',
    contactEmail: 'communications@aver.technologies.com',
    officeAddress: '100 Marina Boulevard, Suite 400, San Francisco, CA 94123',
    sections: [
      {
        id: 'elec-sec-1',
        number: '1',
        title: 'Consent to Electronic Communications',
        content: 'You agree that Aver Technologies may deliver all disclosures, privacy policies, operational statements, platform warnings, and transaction receipts electronically. Delivery will be executed either by posting directly on the user terminal console, sending to your registered email address, or dispatching alert signals via localized push protocols.'
      },
      {
        id: 'elec-sec-2',
        number: '2',
        title: 'Required System Hardware and Software',
        content: 'To receive, access, and archive electronic communications from Aver, you must utilize: (a) An active internet connection, (b) A modern browser supporting HTML5, CSS3, and ES6+ JavaScript, (c) An active, authorized email address capable of receiving external HTML attachments, and (d) Sufficient storage space or an attached printer to download and preserve communications.'
      },
      {
        id: 'elec-sec-3',
        number: '3',
        title: 'Delivery of Disclosures and Notices',
        content: 'All electronic communications are considered "received" by you within twenty-four (24) hours of the time they are posted to our web interfaces or dispatched to your registered email inbox. It is your responsibility to review your active terminal logs and email folders regularly.'
      },
      {
        id: 'elec-sec-4',
        number: '4',
        title: 'Withdrawal of Consent Protocols',
        content: 'You have the right to withdraw your consent to electronic communications at any time. However, because Aver is a cloud-based digital trading platform, physical paper-based communications are not supported. Withdrawing your consent will result in the immediate de-authorization of your client profile and termination of your system access.'
      }
    ]
  }
];
