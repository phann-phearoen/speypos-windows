# Graph Report - speypos-pwa  (2026-07-31)

## Corpus Check
- 132 files · ~60,367 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 753 nodes · 1792 edges · 45 communities (43 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f91dc03c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_useTranslation|useTranslation]]
- [[_COMMUNITY_api.ts|api.ts]]
- [[_COMMUNITY_StoreManagement.tsx|StoreManagement.tsx]]
- [[_COMMUNITY_pos.ts|pos.ts]]
- [[_COMMUNITY_sidebar.tsx|sidebar.tsx]]
- [[_COMMUNITY_ShiftContext.tsx|ShiftContext.tsx]]
- [[_COMMUNITY_use-toast.ts|use-toast.ts]]
- [[_COMMUNITY_OrderHistoryManagement.tsx|OrderHistoryManagement.tsx]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_components.json|components.json]]
- [[_COMMUNITY_currency.ts|currency.ts]]
- [[_COMMUNITY_SettingsContext.tsx|SettingsContext.tsx]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_utils.ts|utils.ts]]
- [[_COMMUNITY_cn|cn]]
- [[_COMMUNITY_form.tsx|form.tsx]]
- [[_COMMUNITY_carousel.tsx|carousel.tsx]]
- [[_COMMUNITY_OrderingView.tsx|OrderingView.tsx]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_Technical Details|Technical Details]]
- [[_COMMUNITY_menubar.tsx|menubar.tsx]]
- [[_COMMUNITY_chart.tsx|chart.tsx]]
- [[_COMMUNITY_command.tsx|command.tsx]]
- [[_COMMUNITY_ShiftPage.test.tsx|ShiftPage.test.tsx]]
- [[_COMMUNITY_context-menu.tsx|context-menu.tsx]]
- [[_COMMUNITY_dropdown-menu.tsx|dropdown-menu.tsx]]
- [[_COMMUNITY_alert-dialog.tsx|alert-dialog.tsx]]
- [[_COMMUNITY_verify-shift-ux-feature.mjs|verify-shift-ux-feature.mjs]]
- [[_COMMUNITY_breadcrumb.tsx|breadcrumb.tsx]]
- [[_COMMUNITY_navigation-menu.tsx|navigation-menu.tsx]]
- [[_COMMUNITY_Welcome to your Lovable project|Welcome to your Lovable project]]
- [[_COMMUNITY_toggle-group.tsx|toggle-group.tsx]]
- [[_COMMUNITY_input-otp.tsx|input-otp.tsx]]
- [[_COMMUNITY_categoryColors.ts|categoryColors.ts]]
- [[_COMMUNITY_accordion.tsx|accordion.tsx]]
- [[_COMMUNITY_cloud-sync|cloud-sync.md]]
- [[_COMMUNITY_menu-category-customization-group.routes.js|menu-category-customization-group.routes.js]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 76 edges
2. `useTranslation()` - 62 edges
3. `useCurrency()` - 37 edges
4. `t()` - 30 edges
5. `useToast()` - 24 edges
6. `Button` - 21 edges
7. `useSettings()` - 21 edges
8. `compilerOptions` - 19 edges
9. `PaymentPage()` - 14 edges
10. `OrderItem` - 14 edges

## Surprising Connections (you probably didn't know these)
- `OrderHistoryManagement()` --calls--> `formatLongDate()`  [EXTRACTED]
  src/components/admin/OrderHistoryManagement.tsx → src/lib/datetime.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `BreadcrumbSeparator()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/breadcrumb.tsx → src/lib/utils.ts
- `BreadcrumbEllipsis()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/breadcrumb.tsx → src/lib/utils.ts

## Import Cycles
- 1-file cycle: `src/components/ui/sonner.tsx -> src/components/ui/sonner.tsx`
- 1-file cycle: `src/components/ui/input-otp.tsx -> src/components/ui/input-otp.tsx`

## Communities (45 total, 2 thin omitted)

### Community 0 - "useTranslation"
Cohesion: 0.07
Nodes (67): queryClient, CategoryManagement(), CustomizationManagement(), MenuItemManagement(), OrderHistoryManagement(), SettingsManagement(), StaffManagement(), StoreManagement() (+59 more)

### Community 1 - "api.ts"
Cohesion: 0.05
Nodes (72): CategoryFormData, initialFormData, GroupFormData, initialGroupForm, initialOptionForm, OptionFormData, ImageUpload(), ImageUploadProps (+64 more)

### Community 2 - "StoreManagement.tsx"
Cohesion: 0.06
Nodes (51): DEFAULT_RECEIPT_COPIES, INTENT_DESCRIPTIONS, INTENT_LABELS, RECEIPT_VARIANTS, initialFormData, StaffFormData, CURRENCY_OPTIONS, LANGUAGE_OPTIONS (+43 more)

### Community 3 - "pos.ts"
Cohesion: 0.06
Nodes (47): AnimatedAmount(), AnimatedAmountProps, DIGITS, usePrefersReducedMotion(), CustomizationModalProps, CustomizationPanelProps, ToppingGroupWithOptions, ActiveOrderItemHighlight (+39 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.05
Nodes (37): Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+29 more)

### Community 5 - "ShiftContext.tsx"
Cohesion: 0.09
Nodes (24): Logo(), LogoProps, sizeMap, NavLink, NavLinkCompatProps, HeaderProps, ShiftScreenProps, sizeMap (+16 more)

### Community 6 - "use-toast.ts"
Cohesion: 0.12
Nodes (22): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+14 more)

### Community 7 - "OrderHistoryManagement.tsx"
Cohesion: 0.16
Nodes (15): mocks, ButtonProps, buttonVariants, Calendar(), CalendarProps, Pagination(), PaginationContent, PaginationItem (+7 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+13 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 10 - "currency.ts"
Cohesion: 0.21
Nodes (15): PaymentScreen(), PaymentScreenProps, PaymentType, CURRENCIES, CurrencyMetadata, DENOMINATIONS, format(), generateQuickAmounts() (+7 more)

### Community 11 - "SettingsContext.tsx"
Cohesion: 0.15
Nodes (12): SettingsContext, SettingsContextValue, SettingsProvider(), settingsApi, storeApi, formatDate(), formatDateTime(), formatLongDate() (+4 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 13 - "utils.ts"
Cohesion: 0.13
Nodes (9): Avatar, AvatarFallback, AvatarImage, HoverCardContent, Progress, Slider, TabsContent, TabsList (+1 more)

### Community 14 - "cn"
Cohesion: 0.18
Nodes (11): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle, PaginationEllipsis(), ResizableHandle() (+3 more)

### Community 15 - "form.tsx"
Cohesion: 0.14
Nodes (11): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+3 more)

### Community 16 - "carousel.tsx"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 17 - "OrderingView.tsx"
Cohesion: 0.24
Nodes (8): OrderingViewProps, ScrollArea, ScrollBar, DisplayVariationGroup, generateDisplaySignature(), groupDisplayItems(), GroupedDisplayItem, DisplayOrderItem

### Community 18 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, baseUrl, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck (+4 more)

### Community 19 - "Technical Details"
Cohesion: 0.17
Nodes (11): 1. Types (`src/types/pos.ts`), 2. API Layer (`src/lib/api.ts`), 3. Settings Page (`src/components/admin/SettingsManagement.tsx`), 4. Order History - Manual Sync (`src/components/admin/OrderHistoryManagement.tsx`), 5. Settings Context (`src/contexts/SettingsContext.tsx`), 6. Translations (`src/lib/i18n.ts`), Cloud Sync Implementation Plan, Files Modified (+3 more)

### Community 20 - "menubar.tsx"
Cohesion: 0.17
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 21 - "chart.tsx"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 22 - "command.tsx"
Cohesion: 0.18
Nodes (9): Command, CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+1 more)

### Community 23 - "ShiftPage.test.tsx"
Cohesion: 0.18
Nodes (8): mockGetBrandName, mockGetPreviousDayStatus, mockGetStaff, mockNavigate, mockOpenShiftApi, mockRefreshPendingActions, mockTranslation, mockUseShift

### Community 24 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 25 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 26 - "alert-dialog.tsx"
Cohesion: 0.22
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Community 27 - "verify-shift-ux-feature.mjs"
Cohesion: 0.32
Nodes (7): apiPath, assertContains(), i18nPath, projectRoot, read(), run(), shiftPagePath

### Community 28 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 29 - "navigation-menu.tsx"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 30 - "Welcome to your Lovable project"
Cohesion: 0.29
Nodes (6): Can I connect a custom domain to my Lovable project?, How can I deploy this project?, How can I edit this code?, Project info, Welcome to your Lovable project, What technologies are used for this project?

### Community 31 - "toggle-group.tsx"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 32 - "input-otp.tsx"
Cohesion: 0.50
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 33 - "categoryColors.ts"
Cohesion: 0.60
Nodes (4): CATEGORY_HUES, getCategoryHueFromId(), getCategorySurfaceColors(), normalizeCategoryId()

### Community 34 - "accordion.tsx"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

## Knowledge Gaps
- **328 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+323 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `useTranslation`, `api.ts`, `StoreManagement.tsx`, `sidebar.tsx`, `ShiftContext.tsx`, `use-toast.ts`, `OrderHistoryManagement.tsx`, `utils.ts`, `form.tsx`, `carousel.tsx`, `OrderingView.tsx`, `menubar.tsx`, `chart.tsx`, `command.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `toggle-group.tsx`, `input-otp.tsx`, `accordion.tsx`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `useTranslation()` connect `useTranslation` to `api.ts`, `StoreManagement.tsx`, `pos.ts`, `ShiftContext.tsx`, `OrderHistoryManagement.tsx`, `currency.ts`, `OrderingView.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Button` connect `api.ts` to `useTranslation`, `StoreManagement.tsx`, `sidebar.tsx`, `ShiftContext.tsx`, `OrderHistoryManagement.tsx`, `carousel.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _328 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTranslation` be split into smaller, more focused modules?**
  _Cohesion score 0.0691912108461898 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052184769038701624 - nodes in this community are weakly interconnected._
- **Should `StoreManagement.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05632360471070148 - nodes in this community are weakly interconnected._