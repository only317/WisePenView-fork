/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 */
export {
  ServicesProvider,
  useAdminService,
  useAgentService,
  useAuthService,
  useChatService,
  useDocumentService,
  useDriveService,
  useGroupService,
  useImageService,
  useNoteService,
  useQuotaService,
  useResourceService,
  useSkillService,
  useTagService,
  useUserService,
  useWalletService,
} from './_registry';
export type { ServicesContextValue } from './_registry';
