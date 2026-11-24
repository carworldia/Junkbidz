const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const TagIcon = () => (
  <svg {...base}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
);
export const GaugeIcon = () => (
  <svg {...base}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>
);
export const GridIcon = () => (
  <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
export const ListIcon = () => (
  <svg {...base}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const MenuIcon = ({ open }: { open: boolean }) => (
  <svg {...base}>{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
);

export const HomeIcon = () => (<svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg>);
export const CarIcon = () => (<svg {...base}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>);
export const WrenchIcon = () => (<svg {...base}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>);
export const UserIcon = () => (<svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
export const SearchIcon = () => (<svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const PinIcon = () => (<svg {...base}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const SlidersIcon = () => (<svg {...base}><path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></svg>);
// Direction-implying icons carry class "flip-rtl" so they mirror in right-to-left languages.
export const ChevronRightIcon = () => (<svg {...base} className="flip-rtl"><path d="m9 6 6 6-6 6" /></svg>);
export const GlobeIcon = () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.500 18.400 12 21c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z" /></svg>);
export const PeopleIcon = () => (<svg {...base}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.6" /><path d="M17 14.5a5.5 5.5 0 0 1 4.5 5.5" /></svg>);

// Home page + saved cars
export const PostIcon = () => (<svg {...base}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 12v6M9 15h6" /></svg>);
export const BidIcon = () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M14.6 9.3c-.4-.9-1.400-1.400-2.600-1.400-1.500 0-2.500.8-2.500 1.900 0 2.500 5 1.300 5 3.900 0 1.100-1.100 2-2.600 2-1.300 0-2.400-.5-2.800-1.500M12 6.400v1.500m0 8.200v1.500" /></svg>);
export const ChatIcon = () => (<svg {...base}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></svg>);
export const ShieldIcon = () => (<svg {...base}><path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>);
export const PhoneOffIcon = () => (<svg {...base}><path d="M5 4h3l2 5-2.500 1.500a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /><path d="M3 3l18 18" /></svg>);
export const MailOffIcon = () => (<svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /><path d="M4 20 20 4" /></svg>);
export const BoltIcon = () => (<svg {...base}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>);
export const GiftIcon = () => (<svg {...base}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M7.500 8a2.500 2.500 0 1 1 0-5C10 3 12 8 12 8s2-5 4.500-5a2.500 2.500 0 1 1 0 5" /></svg>);
export const CheckIcon = () => (<svg {...base}><path d="m5 12 5 5L20 7" /></svg>);
// Filled when saved (the parent sets fill via CSS class).
export const HeartIcon = () => (<svg {...base}><path d="M20.800 5.600a5.200 5.200 0 0 0-7.400 0L12 7l-1.400-1.400a5.200 5.200 0 0 0-7.400 7.400L12 21.800l8.800-8.800a5.200 5.200 0 0 0 0-7.400z" /></svg>);
export const ClockIcon = () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const BuildingIcon = () => (<svg {...base}><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10" /><path d="M2 21h20M8 7h4M8 11h4M8 15h4" /></svg>);
export const TruckIcon = () => (<svg {...base}><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>);
export const PlusIcon = () => (<svg {...base}><path d="M12 5v14M5 12h14" /></svg>);
export const BoxIcon = () => (<svg {...base}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>);
export const StarIcon = () => (<svg {...base}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>);
