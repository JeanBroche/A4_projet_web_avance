export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl'

const MODAL_MAX: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl'
}

/** Classes Nuxt UI pour modales adaptées mobile (pleine largeur utile + scroll). */
export function modalUi(size: ModalSize = 'lg') {
  return {
    content: `w-[calc(100vw-1.25rem)] sm:w-full ${MODAL_MAX[size]} max-h-[min(92dvh,100vh)] flex flex-col overflow-hidden`,
    overlay: 'backdrop-blur-[1px]'
  }
}

export const MODAL_BODY = 'flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain'
export const MODAL_FOOTER = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end shrink-0 p-4 sm:px-6 sm:pb-6 pt-0 sm:pt-0 border-t border-gray-100'

export const PAGE_HEADER = 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 sm:mb-6'
export const PAGE_TITLE = 'text-xl sm:text-2xl font-bold text-[#0F62BC]'
export const PAGE_SUBTITLE = 'text-xs sm:text-sm text-gray-500 mt-0.5'
export const TOOLBAR = 'flex flex-col gap-2 sm:flex-row sm:items-center mb-4 sm:mb-6'
export const TOOLBAR_ACTIONS = 'flex flex-col xs:flex-row gap-2 w-full sm:w-auto sm:items-center'
