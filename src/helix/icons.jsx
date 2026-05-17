/* HELIX ICONS — minimal stroke set, children-only pattern.
   ESM build of the Helix icon set for use inside a Vite/React app. */
const HxIcon = ({ children, size = 16, fill = 'none', stroke = 'currentColor', strokeWidth = 1.75, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
)

const P = (d) => <path d={d} />

export const I = {
  Search: (p) => <HxIcon {...p}><circle cx="11" cy="11" r="7" />{P('m20 20-3.5-3.5')}</HxIcon>,
  Bell: (p) => <HxIcon {...p}>{P('M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zm3 12a3 3 0 0 0 6 0')}</HxIcon>,
  Home: (p) => <HxIcon {...p}>{P('M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z')}</HxIcon>,
  Users: (p) => <HxIcon {...p}><circle cx="9" cy="8" r="3" />{P('M3 20c0-3 2.5-5 6-5s6 2 6 5M16 4a3 3 0 0 1 0 6M21 20c0-2-1.5-4-4-4.5')}</HxIcon>,
  Check: (p) => <HxIcon {...p}>{P('m5 12 5 5 9-11')}</HxIcon>,
  Plus: (p) => <HxIcon {...p}>{P('M12 5v14M5 12h14')}</HxIcon>,
  Info: (p) => <HxIcon {...p}><circle cx="12" cy="12" r="9" />{P('M12 11v5M12 8h.01')}</HxIcon>,
  Warn: (p) => <HxIcon {...p}>{P('M12 3 2 20h20zM12 10v4M12 17h.01')}</HxIcon>,
  Success: (p) => <HxIcon {...p}><circle cx="12" cy="12" r="9" />{P('m8 12 3 3 5-6')}</HxIcon>,
  Logout: (p) => <HxIcon {...p}>{P('M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9')}</HxIcon>,
  More: (p) => <HxIcon {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></HxIcon>,
  Trash: (p) => <HxIcon {...p}>{P('M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6M10 11v6M14 11v6')}</HxIcon>,
  External: (p) => <HxIcon {...p}>{P('M14 4h6v6M20 4 10 14M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6')}</HxIcon>,
  Calendar: (p) => <HxIcon {...p}><rect x="3" y="5" width="18" height="16" rx="1" />{P('M3 10h18M8 3v4M16 3v4')}</HxIcon>,
  Globe: (p) => <HxIcon {...p}><circle cx="12" cy="12" r="9" />{P('M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z')}</HxIcon>,
  Refresh: (p) => <HxIcon {...p}>{P('M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5')}</HxIcon>,
  Sun: (p) => <HxIcon {...p}><circle cx="12" cy="12" r="4" />{P('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41')}</HxIcon>,
  Moon: (p) => <HxIcon {...p}>{P('M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z')}</HxIcon>,
  X: (p) => <HxIcon {...p}>{P('m6 6 12 12M18 6 6 18')}</HxIcon>,
  Close: (p) => <HxIcon {...p}>{P('m6 6 12 12M18 6 6 18')}</HxIcon>,
  Clock: (p) => <HxIcon {...p}><circle cx="12" cy="12" r="9" />{P('M12 7v5l3 2')}</HxIcon>,
  ArrowRight: (p) => <HxIcon {...p}>{P('M5 12h14m0 0-6-6m6 6-6 6')}</HxIcon>,
  ArrowLeft: (p) => <HxIcon {...p}>{P('M19 12H5m0 0 6 6m-6-6 6-6')}</HxIcon>,
  ChevronRight: (p) => <HxIcon {...p}>{P('m9 6 6 6-6 6')}</HxIcon>,
  ChevronDown: (p) => <HxIcon {...p}>{P('m6 9 6 6 6-6')}</HxIcon>,
  Activity: (p) => <HxIcon {...p}>{P('M3 12h4l3-9 4 18 3-9h4')}</HxIcon>,
  Shield: (p) => <HxIcon {...p}>{P('M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z')}</HxIcon>,
  Sparkles: (p) => <HxIcon {...p}>{P('M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8')}</HxIcon>,
  Tag: (p) => <HxIcon {...p}>{P('M3 12V3h9l9 9-9 9zM7.5 7.5h.01')}</HxIcon>,
  Scan: (p) => <HxIcon {...p}>{P('M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10')}</HxIcon>,
  QrCode: (p) => <HxIcon {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />{P('M14 14h3v3M21 14v.01M14 21h7M21 17v4')}</HxIcon>,
  TrendingUp: (p) => <HxIcon {...p}>{P('M22 7 13.5 15.5l-5-5L2 17M16 7h6v6')}</HxIcon>,
  CreditCard: (p) => <HxIcon {...p}><rect x="2" y="5" width="20" height="14" rx="2" />{P('M2 10h20')}</HxIcon>,
  Phone: (p) => <HxIcon {...p}>{P('M5 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2')}</HxIcon>,
  MapPin: (p) => <HxIcon {...p}>{P('M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z')}<circle cx="12" cy="10" r="2.5" /></HxIcon>,
  Waves: (p) => <HxIcon {...p}>{P('M2 7c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2M2 13c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2M2 19c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2')}</HxIcon>,
  UserPlus: (p) => <HxIcon {...p}><circle cx="9" cy="8" r="3.2" />{P('M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M18 8v6M21 11h-6')}</HxIcon>
}

export default I
