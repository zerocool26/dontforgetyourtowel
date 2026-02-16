export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  details?: string[];
  icon?: string;
}

export const servicesExtended: Service[] = [
  // 1. IT Security
  {
    id: 'mdr',
    name: 'Managed Detection and Response (MDR)',
    category: 'IT Security',
    description:
      '24/7 proactive threat hunting and rapid incident containment across endpoints and networks.',
  },
  {
    id: 'ai-red-teaming',
    name: 'AI-Native Red Teaming',
    category: 'IT Security',
    description:
      'Advanced adversary simulations targeting AI model vulnerabilities, prompt injection, and data leakage.',
  },
  {
    id: 'zero-trust-design',
    name: 'Zero Trust Architecture Design',
    category: 'IT Security',
    description:
      "Implementation of 'never trust, always verify' frameworks to secure distributed enterprise environments.",
  },
  {
    id: 'cspm',
    name: 'Cloud Security Posture Management (CSPM)',
    category: 'IT Security',
    description:
      'Continuous monitoring and automated remediation of misconfigurations in multi-cloud environments.',
  },
  {
    id: 'quantum-resistant-encryption',
    name: 'Quantum-Resistant Encryption Deployment',
    category: 'IT Security',
    description:
      'Future-proofing sensitive data assets against emerging quantum computing decryption threats.',
  },
  {
    id: 'iam-modernization',
    name: 'Identity and Access Management (IAM) Modernization',
    category: 'IT Security',
    description:
      'Implementation of passwordless authentication and adaptive risk-based access controls.',
  },
  {
    id: 'sbom-security',
    name: 'Software Supply Chain Security (SBOM)',
    category: 'IT Security',
    description:
      'End-to-end visibility and risk assessment of third-party code and open-source dependencies.',
  },
  {
    id: 'dfir',
    name: 'Digital Forensics and Incident Response (DFIR)',
    category: 'IT Security',
    description:
      'Expert-led recovery and investigation services to minimize downtime after a cyber breach.',
  },
  {
    id: 'devsecops-pipeline',
    name: 'DevSecOps Pipeline Integration',
    category: 'IT Security',
    description:
      'Embedding automated security scanning and compliance checks directly into the CI/CD lifecycle.',
  },
  {
    id: 'managed-dlp',
    name: 'Managed Data Loss Prevention (DLP)',
    category: 'IT Security',
    description:
      'Comprehensive strategies to identify, track, and protect sensitive IP from unauthorized egress.',
  },
  {
    id: 'attack-surface-management',
    name: 'Attack Surface Management (ASM)',
    category: 'IT Security',
    description:
      'Continuous discovery and mapping of external-facing assets to eliminate blind spots.',
  },
  {
    id: 'blockchain-audit',
    name: 'Blockchain and Smart Contract Audits',
    category: 'IT Security',
    description:
      'Deep-dive security analysis of decentralized protocols and distributed ledger implementations.',
  },
  {
    id: 'ot-ics-security',
    name: 'OT/ICS Industrial Security',
    category: 'IT Security',
    description:
      'Specialized protection for critical infrastructure, manufacturing systems, and IoT environments.',
  },
  {
    id: 'compliance-orchestration',
    name: 'Compliance Orchestration (SOC2/GDPR)',
    category: 'IT Security',
    description:
      'Automated evidence collection and continuous compliance monitoring for global regulatory standards.',
  },
  {
    id: 'vciso-advisory',
    name: 'vCISO Strategic Advisory',
    category: 'IT Security',
    description:
      'Executive-level security leadership and risk management tailored for mid-to-large enterprises.',
  },
  {
    id: 'insider-threat-mitigation',
    name: 'Insider Threat Mitigation',
    category: 'IT Security',
    description:
      'Behavioral analytics and monitoring to detect and prevent data theft by internal actors.',
  },
  {
    id: 'dark-web-intelligence',
    name: 'Dark Web Threat Intelligence',
    category: 'IT Security',
    description:
      'Proactive monitoring of underground forums to identify leaked credentials and planned attacks.',
  },

  // 2. MSP Services
  {
    id: 'global-service-desk',
    name: '24/7 Global IT Service Desk',
    category: 'MSP Services',
    description:
      'Round-the-clock technical support and ticket resolution for a worldwide workforce.',
  },
  {
    id: 'automated-endpoint',
    name: 'Automated Endpoint Management',
    category: 'MSP Services',
    description:
      'Centralized orchestration of software deployments, updates, and health monitoring for all devices.',
  },
  {
    id: 'vcio-consulting',
    name: 'vCIO Strategic Consulting',
    category: 'MSP Services',
    description:
      'High-level technology roadmapping and budget alignment to drive business growth and efficiency.',
  },
  {
    id: 'bcdr-managed',
    name: 'Business Continuity and Disaster Recovery (BCDR)',
    category: 'MSP Services',
    description:
      'Managed backup and rapid failover solutions for critical enterprise data and systems.',
  },
  {
    id: 'saas-ops',
    name: 'Managed SaaS Operations (SaaS-Ops)',
    category: 'MSP Services',
    description:
      'Centralized management and optimization of the enterprise software-as-a-service portfolio.',
  },
  {
    id: 'hybrid-workforce',
    name: 'Hybrid Workforce Enablement',
    category: 'MSP Services',
    description:
      'Designing and supporting secure, high-performance remote and office-based work environments.',
  },
  {
    id: 'asset-lifecycle',
    name: 'IT Asset Lifecycle Management',
    category: 'MSP Services',
    description:
      'End-to-end tracking of hardware from procurement and configuration to secure retirement.',
  },
  {
    id: 'patch-management',
    name: 'Proactive Patch Management',
    category: 'MSP Services',
    description:
      'Automated vulnerability remediation across diverse operating systems and third-party applications.',
  },
  {
    id: 'managed-print',
    name: 'Managed Print and Imaging Services',
    category: 'MSP Services',
    description:
      'Optimization of document workflows and hardware maintenance to reduce operational overhead.',
  },
  {
    id: 'vendor-management',
    name: 'Vendor Relationship Management (VRM)',
    category: 'MSP Services',
    description:
      'Strategic coordination of third-party technology providers to ensure service level alignment.',
  },
  {
    id: 'infrastructure-monitoring',
    name: 'Infrastructure Health Monitoring',
    category: 'MSP Services',
    description:
      'Real-time observability and AI-driven alerting for servers, storage, and local networks.',
  },
  {
    id: 'procurement-logistics',
    name: 'IT Procurement and Logistics',
    category: 'MSP Services',
    description:
      'Streamlined hardware acquisition and global shipping for rapid employee onboarding.',
  },
  {
    id: 'waas',
    name: 'Workspace-as-a-Service (WaaS)',
    category: 'MSP Services',
    description:
      'Delivering standardized, virtualized desktop environments accessible from any device anywhere.',
  },
  {
    id: 'white-glove-support',
    name: 'Executive White-Glove Support',
    category: 'MSP Services',
    description:
      'Priority technical assistance and customized solutions for C-suite and high-value personnel.',
  },
  {
    id: 'unified-communications',
    name: 'Unified Communications Management',
    category: 'MSP Services',
    description:
      'Administration of enterprise voice, video, and collaboration platforms (Teams, Zoom, Slack).',
  },
  {
    id: 'data-residency',
    name: 'Data Residency and Sovereignty Services',
    category: 'MSP Services',
    description:
      'Ensuring IT infrastructure and data storage comply with local jurisdictional requirements.',
  },
  {
    id: 'change-management',
    name: 'Change Management and ITIL Alignment',
    category: 'MSP Services',
    description:
      'Standardizing IT processes to minimize service disruptions during system updates and migrations.',
  },

  // 3. AI Consulting
  {
    id: 'gen-ai-strategy',
    name: 'Generative AI Strategy and Roadmap',
    category: 'AI Consulting',
    description:
      'C-level advisory on identifying high-ROI use cases for Large Language Models.',
  },
  {
    id: 'llm-fine-tuning',
    name: 'Custom LLM Fine-Tuning',
    category: 'AI Consulting',
    description:
      'Optimizing pre-trained models on proprietary enterprise data for specialized domain expertise.',
  },
  {
    id: 'ai-agent-orchestration',
    name: 'AI Agent Orchestration',
    category: 'AI Consulting',
    description:
      'Designing autonomous multi-agent systems to automate complex, multi-step business processes.',
  },
  {
    id: 'responsible-ai',
    name: 'Responsible AI Frameworks',
    category: 'AI Consulting',
    description:
      'Establishing ethical guidelines, bias detection, and transparency standards for AI deployments.',
  },
  {
    id: 'mlops-engineering',
    name: 'MLOps Pipeline Engineering',
    category: 'AI Consulting',
    description:
      'Building robust production environments for the continuous training and monitoring of ML models.',
  },
  {
    id: 'data-fabric',
    name: 'Enterprise Data Fabric Design',
    category: 'AI Consulting',
    description:
      'Creating a unified data architecture to feed high-quality information into AI systems.',
  },
  {
    id: 'conversational-ai',
    name: 'Conversational AI Development',
    category: 'AI Consulting',
    description:
      'Building intelligent virtual assistants for customer support and internal knowledge retrieval.',
  },
  {
    id: 'predictive-analytics',
    name: 'AI-Driven Predictive Analytics',
    category: 'AI Consulting',
    description:
      'Leveraging machine learning to forecast market trends, demand, and operational failures.',
  },
  {
    id: 'edge-ai',
    name: 'Edge AI Implementation',
    category: 'AI Consulting',
    description:
      'Deploying lightweight AI models directly onto hardware devices for real-time local processing.',
  },
  {
    id: 'ai-governance-audit',
    name: 'AI Governance and Risk Audit',
    category: 'AI Consulting',
    description:
      'Evaluating AI systems for compliance, security risks, and technical debt.',
  },
  {
    id: 'knowledge-graph',
    name: 'Knowledge Graph Engineering',
    category: 'AI Consulting',
    description:
      'Modeling complex organizational data relationships to enhance AI reasoning and search.',
  },
  {
    id: 'synthetic-data',
    name: 'Synthetic Data Generation',
    category: 'AI Consulting',
    description:
      'Creating privacy-compliant, high-fidelity datasets for model training and testing.',
  },
  {
    id: 'ai-productivity-training',
    name: 'AI Productivity Training',
    category: 'AI Consulting',
    description:
      'Empowering employees with tools and techniques to leverage AI in their daily workflows.',
  },
  {
    id: 'nas-automation',
    name: 'Neural Architecture Search (NAS)',
    category: 'AI Consulting',
    description:
      'Using AI to automate the design of optimal neural network structures for specific tasks.',
  },
  {
    id: 'vision-automation',
    name: 'Computer Vision for Industrial Automation',
    category: 'AI Consulting',
    description:
      'Implementing automated visual inspection and monitoring for manufacturing and logistics.',
  },
  {
    id: 'process-discovery',
    name: 'Automated Process Discovery',
    category: 'AI Consulting',
    description:
      'Using task mining and AI to identify bottlenecks and candidates for robotic process automation.',
  },

  // 4. Application Development
  {
    id: 'saas-engineering',
    name: 'Enterprise SaaS Platform Engineering',
    category: 'Application Development',
    description:
      'Architectural design and development of scalable, multi-tenant cloud software.',
  },
  {
    id: 'native-mobile',
    name: 'Native iOS and Android Development',
    category: 'Application Development',
    description:
      'Building high-performance, platform-optimized mobile experiences for global users.',
  },
  {
    id: 'unity-unreal-sculpt',
    name: 'Unity and Unreal Engine Solutions',
    category: 'Application Development',
    description:
      'Creating immersive 3D simulations, games, and industrial digital twins.',
  },
  {
    id: 'web3-dapp',
    name: 'Web3 and dApp Development',
    category: 'Application Development',
    description:
      'Engineering decentralized applications and smart contracts on Ethereum, Solana, and Layer 2s.',
  },
  {
    id: 'legacy-modernization',
    name: 'Legacy System Modernization',
    category: 'Application Development',
    description:
      'Refactoring and migrating aging monoliths into modern, cloud-native microservices architectures.',
  },
  {
    id: 'pwa-design',
    name: 'Progressive Web App (PWA) Design',
    category: 'Application Development',
    description:
      'Developing web-based applications that offer app-like feel and offline functionality.',
  },
  {
    id: 'api-first-strategy',
    name: 'API-First Platform Strategy',
    category: 'Application Development',
    description:
      'Designing robust, well-documented APIs to power ecosystem growth and internal integrations.',
  },
  {
    id: 'low-code-enablement',
    name: 'Low-Code/No-Code Enablement',
    category: 'Application Development',
    description:
      'Building custom internal tools and empowering business units with governed platform access.',
  },
  {
    id: 'desktop-software',
    name: 'High-Performance Desktop Software',
    category: 'Application Development',
    description:
      'Developing specialized, resource-intensive applications for Windows, macOS, and Linux.',
  },
  {
    id: 'ux-ui-design-systems',
    name: 'Modern UX/UI Design Systems',
    category: 'Application Development',
    description:
      'Establishing consistent, accessible, and high-impact visual languages across all digital products.',
  },
  {
    id: 'micro-frontend',
    name: 'Micro-frontend Architecture',
    category: 'Application Development',
    description:
      'Breaking down complex web frontends into manageable, independently deployable modules.',
  },
  {
    id: 'embedded-firmware',
    name: 'Embedded Systems and Firmware',
    category: 'Application Development',
    description:
      'Writing low-level software for specialized hardware, IoT devices, and wearables.',
  },
  {
    id: 'ar-vr-xr',
    name: 'AR/VR/XR Immersive Experiences',
    category: 'Application Development',
    description:
      'Developing specialized applications for training, visualization, and digital showrooming.',
  },
  {
    id: 'qa-automation',
    name: 'QA Automation and Testing Frameworks',
    category: 'Application Development',
    description:
      'Building comprehensive, automated test suites to ensure software reliability and speed.',
  },
  {
    id: 'real-time-collab',
    name: 'Real-Time Collaborative Software',
    category: 'Application Development',
    description:
      'Engineering applications with sub-second synchronization for distributed team productivity.',
  },
  {
    id: 'discovery-prototyping',
    name: 'Product Discovery and Prototyping',
    category: 'Application Development',
    description:
      'Rapidly validating business ideas through user research and high-fidelity interactive models.',
  },
  {
    id: 'ecommerce-personalization',
    name: 'E-commerce Engine Personalization',
    category: 'Application Development',
    description:
      'Implementing advanced search, recommendation, and checkout optimizations for online retail.',
  },

  // 5. Network Engineering
  {
    id: 'sd-wan-deployment',
    name: 'SD-WAN Strategy and Deployment',
    category: 'Network Engineering',
    description:
      'Optimizing wide-area networks for cloud performance and cost-effective connectivity.',
  },
  {
    id: 'private-5g',
    name: 'Private 5G/6G Infrastructure',
    category: 'Network Engineering',
    description:
      'Building dedicated, ultra-low latency wireless networks for smart factories and campuses.',
  },
  {
    id: 'sase-convergence',
    name: 'Secure Access Service Edge (SASE)',
    category: 'Network Engineering',
    description:
      'Converging networking and security into a single, cloud-delivered service model.',
  },
  {
    id: 'sdn-automation',
    name: 'Software-Defined Networking (SDN)',
    category: 'Network Engineering',
    description:
      'Implementing programmable network architectures for maximum agility and automation.',
  },
  {
    id: 'nfv-virtualization',
    name: 'Network Function Virtualization (NFV)',
    category: 'Network Engineering',
    description:
      'Replacing traditional hardware appliances with scalable, software-based network services.',
  },
  {
    id: 'edge-connectivity',
    name: 'Edge Computing Connectivity',
    category: 'Network Engineering',
    description:
      'Designing the network fabric and low-latency links required for distributed edge nodes.',
  },
  {
    id: 'high-density-wireless',
    name: 'High-Density Wireless Systems',
    category: 'Network Engineering',
    description:
      'Engineering robust Wi-Fi 7 networks for stadiums, hospitals, and high-traffic office spaces.',
  },
  {
    id: 'cdn-optimization',
    name: 'Global CDN Optimization',
    category: 'Network Engineering',
    description:
      'Designing custom content delivery strategies to minimize latency for global user bases.',
  },
  {
    id: 'aiops-network',
    name: 'AIOps for Network Management',
    category: 'Network Engineering',
    description:
      'Using AI and machine learning to predict network outages and automate remediation.',
  },
  {
    id: 'hybrid-interconnect',
    name: 'Hybrid Cloud Interconnect',
    category: 'Network Engineering',
    description:
      'Building high-speed, secure pathways between on-premises data centers and public clouds.',
  },
  {
    id: 'satellite-resilience',
    name: 'Satellite Connectivity Integration',
    category: 'Network Engineering',
    description:
      'Leveraging LEO constellations like Starlink for resilient remote site communication.',
  },
  {
    id: 'ipam-dns-security',
    name: 'IPAM and DNS Security Modernization',
    category: 'Network Engineering',
    description:
      'Implementing advanced IP address management and DNS-layer threat protection.',
  },
  {
    id: 'optical-backbone',
    name: 'Optical Network Engineering',
    category: 'Network Engineering',
    description:
      'Designing high-capacity fiber backbones and data center interconnects (DCI).',
  },
  {
    id: 'performance-diagnostics',
    name: 'Network Performance Diagnostics (NPMD)',
    category: 'Network Engineering',
    description:
      'Providing deep visibility into packet-level data to resolve complex latency issues.',
  },
  {
    id: 'ztna-modernization',
    name: 'Zero-Trust Network Access (ZTNA)',
    category: 'Network Engineering',
    description:
      'Replacing traditional VPNs with secure, identity-based perimeter-less access.',
  },
  {
    id: 'low-latency-trading',
    name: 'Low-Latency Trading Infrastructure',
    category: 'Network Engineering',
    description:
      'Specialized networking for financial services where every microsecond matters.',
  },

  // 6. Cloud Development
  {
    id: 'cloud-native-design',
    name: 'Cloud-Native Architecture Design',
    category: 'Cloud Development',
    description:
      "Building resilient, auto-scaling applications optimized for the cloud's unique capabilities.",
  },
  {
    id: 'multi-cloud-strategy',
    name: 'Multi-cloud and Inter-cloud Strategy',
    category: 'Cloud Development',
    description:
      'Orchestrating workloads across Azure, AWS, and GCP to avoid vendor lock-in.',
  },
  {
    id: 'iac-terraform',
    name: 'Infrastructure as Code (IaC) Engineering',
    category: 'Cloud Development',
    description:
      'Automating resource provisioning using Terraform, Bicep, and Pulumi.',
  },
  {
    id: 'k8s-orchestration',
    name: 'Kubernetes and Container Orchestration',
    category: 'Cloud Development',
    description:
      'Managing large-scale container deployments for consistent application delivery.',
  },
  {
    id: 'serverless-fars',
    name: 'Serverless Computing Implementation',
    category: 'Cloud Development',
    description:
      'Reducing operational overhead by building applications on FaaS (Lambda/Functions) platforms.',
  },
  {
    id: 'finops-optimization',
    name: 'FinOps and Cloud Cost Optimization',
    category: 'Cloud Development',
    description:
      'Identifying and eliminating cloud waste through rigorous tagging and right-sizing.',
  },
  {
    id: 'hpc-cloud',
    name: 'HPC in the Cloud',
    category: 'Cloud Development',
    description:
      'Running massive High-Performance Computing workloads for scientific and financial simulations.',
  },
  {
    id: 'cloud-migration',
    name: 'Cloud Migration and Workload Mobility',
    category: 'Cloud Development',
    description:
      "Executing seamless 'lift-and-shift' or 'refactor' migrations to public clouds.",
  },
  {
    id: 'cicd-automation',
    name: 'CI/CD Pipeline Automation',
    category: 'Cloud Development',
    description:
      'Streamlining the software delivery lifecycle from code commit to production deployment.',
  },
  {
    id: 'data-warehouse-scaling',
    name: 'Cloud Data Warehouse Management',
    category: 'Cloud Development',
    description:
      'Scaling and optimizing platforms like Snowflake and BigQuery for enterprise analytics.',
  },
  {
    id: 'hybrid-cloud-outposts',
    name: 'Hybrid Cloud Integration (Azure Stack/Outposts)',
    category: 'Cloud Development',
    description:
      'Extending public cloud services into on-premises data centers for data sovereignty.',
  },
  {
    id: 'governance-policy-code',
    name: 'Cloud Governance and Policy-as-Code',
    category: 'Cloud Development',
    description:
      'Implementing automated guardrails to ensure resource security and budget compliance.',
  },
  {
    id: 'service-mesh-mesh',
    name: 'Service Mesh Implementation',
    category: 'Cloud Development',
    description:
      'Managing microservices communication, security, and observability using Istio or Linkerd.',
  },
  {
    id: 'draas-failover',
    name: 'Disaster Recovery as a Service (DRaaS)',
    category: 'Cloud Development',
    description:
      'Providing automated, cloud-based failover for critical business applications.',
  },
  {
    id: 'observability-tracing',
    name: 'Observability and Distributed Tracing',
    category: 'Cloud Development',
    description:
      'Implementing deep monitoring across complex, distributed cloud architectures.',
  },
  {
    id: 'cloud-security-auto',
    name: 'Cloud Security Automation',
    category: 'Cloud Development',
    description:
      'Building automated responders for security events and identity anomalies within the cloud environment.',
  },
  {
    id: 'green-cloud-sustainability',
    name: 'Sustainability and Green Cloud Strategy',
    category: 'Cloud Development',
    description:
      'Measuring and optimizing the carbon footprint of cloud-based digital operations.',
  },
];
