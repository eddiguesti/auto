/**
 * Shared icon components used across export-related UI.
 * Thin wrappers around @tabler/icons-react keeping the original export names
 * so existing consumers stay drop-in compatible.
 *
 * UI icons: size 20 / stroke 1.75. Feature icons: size 24 / stroke 1.5.
 */
import {
  IconX,
  IconChevronRight,
  IconDownload,
  IconSparkles,
  IconBook2,
  IconPackage,
  IconVolume,
  IconCircleCheck
} from '@tabler/icons-react'

export function CloseIcon({ className = '' }) {
  return <IconX size={20} stroke={1.75} className={className} />
}

export function ChevronRightIcon({ className = '' }) {
  return <IconChevronRight size={20} stroke={1.75} className={className} />
}

export function DownloadIcon({ className = '' }) {
  return <IconDownload size={20} stroke={1.75} className={className} />
}

export function StyleIcon({ className = '' }) {
  return <IconSparkles size={24} stroke={1.5} className={className} />
}

export function BookIcon({ className = '' }) {
  return <IconBook2 size={24} stroke={1.5} className={className} />
}

export function PackageIcon({ className = '' }) {
  return <IconPackage size={24} stroke={1.5} className={className} />
}

export function SpeakerIcon({ className = '' }) {
  return <IconVolume size={24} stroke={1.5} className={className} />
}

export function CheckCircleIcon({ className = '' }) {
  return <IconCircleCheck size={16} stroke={1.75} className={className} />
}
