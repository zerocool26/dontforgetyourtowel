export interface PhotoGalleryItem {
  id: string;
  title: string;
  tag: string;
  collection: string;
  location: string;
  format: string;
  note: string;
  alt: string;
  src: string;
}

export const photoGalleryItems: PhotoGalleryItem[] = [
  {
    id: 'operations-studio',
    title: 'Operations studio with live-service energy',
    tag: 'Operations',
    collection: 'Control room',
    location: 'Chicago HQ mood board',
    format: 'Wide frame',
    note: 'Built to support homepage and services art direction where ownership and signal flow need to feel tangible.',
    alt: 'Modern workspace with monitors and collaborative seating used as an operations-inspired visual reference.',
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'service-desk-rhythm',
    title: 'Service desk rhythm and queue ownership',
    tag: 'Support',
    collection: 'Control room',
    location: 'Support storyline',
    format: 'Editorial crop',
    note: 'Useful for showing responsiveness, escalation movement, and support visibility without fake dashboards.',
    alt: 'Team members working together at desks, representing a responsive support operation.',
    src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'network-texture',
    title: 'Network room texture with real infrastructure weight',
    tag: 'Infrastructure',
    collection: 'Field texture',
    location: 'Infrastructure lane',
    format: 'Tall study',
    note: 'Gives the site a more grounded infrastructure language than abstract server illustrations ever could.',
    alt: 'Server and network hardware in a dark equipment room used as an infrastructure reference image.',
    src: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'security-review-surface',
    title: 'Security review surface with sharper contrast',
    tag: 'Cybersecurity',
    collection: 'Inspection deck',
    location: 'Security lane',
    format: 'Poster crop',
    note: 'Ideal for framing controls, risk posture, and response readiness as visible work instead of invisible policy.',
    alt: 'Cybersecurity-themed screen and keyboard arrangement used as a security review visual reference.',
    src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'workflow-review-room',
    title: 'Client-facing workflow review with stakeholders in mind',
    tag: 'Workflow',
    collection: 'Workflow review',
    location: 'Service handoff review',
    format: 'Landscape hero',
    note: 'Works for portal, intake, and service-path storytelling where client trust and interface quality are the focus.',
    alt: 'Collaborative team meeting around laptops, representing a portal, intake, and workflow review session.',
    src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'm365-handoff',
    title: 'Modern office handoff for Microsoft 365 and workflow cleanup',
    tag: 'Microsoft 365',
    collection: 'Workflow scenes',
    location: 'Modern work lane',
    format: 'Wide frame',
    note: 'Supports M365, governance, and process-improvement copy where the environment should feel calm and capable.',
    alt: 'Bright office collaboration space used as a Microsoft 365 and workflow reference image.',
    src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'field-notes-wall',
    title: 'Field notes wall for implementation planning',
    tag: 'Planning',
    collection: 'Workflow scenes',
    location: 'Delivery track',
    format: 'Studio crop',
    note: 'A visual cue for discovery, roadmapping, and phasing conversations that need more personality than stock charts.',
    alt: 'Sticky notes and planning materials on a wall used as a project discovery and roadmap reference.',
    src: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=82',
  },
  {
    id: 'creative-build-bench',
    title: 'Creative build bench for polished delivery',
    tag: 'Studio',
    collection: 'Workflow review',
    location: 'Design system lane',
    format: 'Feature portrait',
    note: 'Gives the site a more crafted, premium energy for design-heavy sections, gallery routes, and feature callouts.',
    alt: 'Design-focused workspace with screens and creative tools used as a premium workflow build reference.',
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=82',
  },
];

export const photoGalleryTags = Array.from(
  new Set(photoGalleryItems.map(item => item.tag))
);

export const photoGalleryCollections = Array.from(
  new Set(photoGalleryItems.map(item => item.collection))
);
