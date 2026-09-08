import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return <IconBase {...props}><path d="m15 18-6-6 6-6" /></IconBase>;
}

export function ChevronRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 18 6-6-6-6" /></IconBase>;
}

export function MinusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14" /></IconBase>;
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
}

export function ReplaceIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 7h-5V2" />
      <path d="M4.8 9a8 8 0 0 1 13-3l2 1" />
      <path d="M4 17h5v5" />
      <path d="M19.2 15a8 8 0 0 1-13 3l-2-1" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 21h14" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z" />
      <path d="m9.4 12 1.7 1.7 3.8-4" />
    </IconBase>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M10 12h5M10 16h5" />
    </IconBase>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </IconBase>
  );
}

export function ToolIcon({ id, ...props }: IconProps & { id: string }) {
  switch (id) {
    case 'merge':
      return <IconBase {...props}><path d="M8 4H4v6h6V6h4v12h-4v-4H4v6h6" /><path d="M14 6h6v12h-6" /></IconBase>;
    case 'split':
      return <IconBase {...props}><path d="M12 3v18" /><path d="M8 5H4v14h4M16 5h4v14h-4" /></IconBase>;
    case 'organize':
      return <IconBase {...props}><rect x="4" y="4" width="6" height="7" rx="1.5" /><rect x="14" y="4" width="6" height="7" rx="1.5" /><rect x="4" y="15" width="6" height="5" rx="1.5" /><rect x="14" y="15" width="6" height="5" rx="1.5" /></IconBase>;
    case 'crop':
      return <IconBase {...props}><path d="M7 3v14a2 2 0 0 0 2 2h12" /><path d="M3 7h14a2 2 0 0 1 2 2v12" /></IconBase>;
    case 'compress':
      return <IconBase {...props}><path d="m8 3 1.5 1.5L6 8M16 3l-1.5 1.5L18 8M8 21l1.5-1.5L6 16M16 21l-1.5-1.5L18 16" /><path d="M9.5 4.5V9H5M14.5 4.5V9H19M9.5 19.5V15H5M14.5 19.5V15H19" /></IconBase>;
    case 'images-to-pdf':
      return <IconBase {...props}><rect x="3" y="5" width="13" height="13" rx="2" /><path d="m5.5 15 3.5-4 2.5 3 2-2 2.5 3" /><path d="M16 8h5v13H8v-3" /></IconBase>;
    case 'pdf-to-images':
      return <IconBase {...props}><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h5" /><circle cx="10" cy="12" r="1" /><path d="m8 18 3-3 2 2 2-2 2 3" /></IconBase>;
    case 'watermark':
      return <IconBase {...props}><path d="M4 7h16M4 17h16" /><path d="m7 14 3-4 2 3 2-2 3 3" /></IconBase>;
    case 'page-numbers':
      return <IconBase {...props}><path d="M7 3h10v18H7z" /><path d="M10 8h4M10 12h4M10 16h4" /></IconBase>;
    case 'forms':
      return <IconBase {...props}><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h2M13 12h2M9 16h6" /></IconBase>;
    case 'protect':
      return <LockIcon {...props} />;
    case 'unlock':
      return <IconBase {...props}><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M15.5 10V7.5a3.5 3.5 0 0 0-6.7-1.4" /></IconBase>;
    case 'ocr':
      return <IconBase {...props}><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M8 9h8M8 12h8M8 15h5" /></IconBase>;
    case 'redact':
      return <IconBase {...props}><path d="M5 6h14M5 18h14" /><rect x="6" y="10" width="12" height="4" rx="1" /></IconBase>;
    case 'metadata':
      return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></IconBase>;
    case 'compare':
      return <IconBase {...props}><path d="M4 5h7v14H4zM13 5h7v14h-7" /><path d="M7 9h1M7 13h1M16 9h1M16 13h1" /></IconBase>;
    case 'sign-visual':
      return <IconBase {...props}><path d="M4 18c2-5 3-9 5-9 1.5 0 .5 5 2 5 1 0 1.5-4 3-4 1.2 0 .5 4 2 4 1.1 0 1.8-1 4-1" /><path d="M4 21h16" /></IconBase>;
    default:
      return <DocumentIcon {...props} />;
  }
}

// Page Organizer v0.4.0-dev icons
export function RotateIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 7v5h-5" /><path d="M18.3 16.5A8 8 0 1 1 19.6 9" /></IconBase>;
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></IconBase>;
}

export function ExtractIcon(props: IconProps) {
  return <IconBase {...props}><path d="M7 3h7l4 4v14H7V3Z" /><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" /></IconBase>;
}

export function UndoIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 7-5 5 5 5" /><path d="M5 12h8a6 6 0 0 1 6 6" /></IconBase>;
}

export function RedoIcon(props: IconProps) {
  return <IconBase {...props}><path d="m15 7 5 5-5 5" /><path d="M19 12h-8a6 6 0 0 0-6 6" /></IconBase>;
}

export function MoveEarlierIcon(props: IconProps) {
  return <IconBase {...props}><path d="m14 7-5 5 5 5" /><path d="M19 5v14" /></IconBase>;
}

export function MoveLaterIcon(props: IconProps) {
  return <IconBase {...props}><path d="m10 7 5 5-5 5" /><path d="M5 5v14" /></IconBase>;
}
