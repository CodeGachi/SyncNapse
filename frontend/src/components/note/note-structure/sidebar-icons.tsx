/**
 * 우측 사이드바 아이콘 버튼들 - Client Component
 * 우측 패널이 닫혀있을 때 표시되는 아이콘들
 * Figma 디자인 기반 2중 원형 구조
 */

"use client";

import { usePanelsStore, useNoteUIStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";

import { motion } from "framer-motion";

interface SidebarIconsProps {
  noteId?: string | null;
  isEducator?: boolean; // 교육자 노트 여부 (prop으로 명시적 전달)
}

export function SidebarIcons({ noteId, isEducator }: SidebarIconsProps) {
  const { isExpanded, toggleExpand } = useNoteUIStore();
  const {
    toggleNotePanel,
    toggleFilePanel,
    toggleScript,
    toggleChatbotPanel,
    toggleCollaborationPanel,
    toggleDrawingSidebar,
    isNotePanelOpen,
    isFilePanelOpen,
    isScriptOpen,
    isChatbotPanelOpen,
    isCollaborationPanelOpen,
    isDrawingSidebarOpen
  } = usePanelsStore();

  // Get note data to determine if it's an educator note
  const { data: note } = useNote(noteId || null);
  // 교육자 노트 여부: prop으로 명시적 전달되면 우선 사용, 아니면 note 데이터에서 가져오기
  const isEducatorNote = isEducator ?? (note?.type === "educator");

  // Helper to open panel and expand sidebar if needed
  const handlePanelToggle = (toggleFn: () => void, isCurrentlyActive: boolean) => {
    // 패널이 닫혀있으면 열기
    if (!isExpanded) {
      toggleExpand();
    }

    // 개별 패널 토글
    toggleFn();

    // 활성화된 패널을 다시 클릭한 경우 -> 패널 닫고, 다른 패널도 모두 닫혀있으면 500px 패널도 닫기
    if (isCurrentlyActive && isExpanded) {
      // 토글 후 상태 확인을 위해 setTimeout 사용
      setTimeout(() => {
        const allPanelsClosed = !isScriptOpen && !isFilePanelOpen && !isChatbotPanelOpen && !isCollaborationPanelOpen;
        if (allPanelsClosed) {
          toggleExpand(); // 500px 패널 닫기
        }
      }, 0);
    }
  };

  // 아이콘 버튼 공통 스타일
  const buttonWrapperClass = "flex flex-col items-center w-[53px] h-[67px]";
  const getButtonClass = (isActive: boolean) =>
    `flex items-center justify-center w-[53px] h-[53px] bg-background-elevated border-2 ${isActive ? 'border-brand' : 'border-foreground'
    } rounded-[30px] hover:bg-background-overlay transition-colors`;
  const iconContainerClass = "grid place-items-center w-[33px] h-[33px] bg-[#d1d5db] dark:bg-background-overlay rounded-[16.5px]";
  const labelClass = "flex items-center justify-center py-0.5 px-2 w-[53px] h-3.5 rounded-[10px] text-foreground font-bold text-[10px] leading-[12px]";
  const iconClass = "flex-shrink-0 text-foreground";

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      className="flex flex-col items-center flex-shrink-0 px-1 py-6 gap-[5px] w-[60px] bg-background-surface"
    >
      {/* 노트 아이콘 (Notes) - 뷰어 하단 노트만 토글, 사이드바 확장 안 함 */}
      <div className={buttonWrapperClass}>
        <button
          onClick={toggleNotePanel}
          className={getButtonClass(isNotePanelOpen)}
          title="Notes"
        >
          <div className={iconContainerClass}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
              <path d="M9 4V22M6 4H17C17.5304 4 18.0391 4.21071 18.4142 4.58579C18.7893 4.96086 19 5.46957 19 6V18C19 18.5304 18.7893 19.0391 18.4142 19.4142C18.0391 19.7893 17.5304 20 17 20H6C5.73478 20 5.48043 19.8946 5.29289 19.7071C5.10536 19.5196 5 19.2652 5 19V5C5 4.73478 5.10536 4.48043 5.29289 4.29289C5.48043 4.10536 5.73478 4 6 4Z" />
              <path d="M13 8H15" />
              <path d="M13 12H15" />
            </svg>
          </div>
        </button>
        <div className={labelClass}>Notes</div>
      </div>

      {/* 스크립트 아이콘 (Script) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleScript, isScriptOpen)}
          className={getButtonClass(isScriptOpen)}
          title="Script"
        >
          <div className={iconContainerClass}>
            <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" className={iconClass}>
              <path d="M17.5 3.4375H2.5C2.0856 3.4375 1.68817 3.60212 1.39515 3.89515C1.10212 4.18817 0.9375 4.5856 0.9375 5V15C0.9375 15.4144 1.10212 15.8118 1.39515 16.1049C1.68817 16.3979 2.0856 16.5625 2.5 16.5625H17.5C17.9144 16.5625 18.3118 16.3979 18.6049 16.1049C18.8979 15.8118 19.0625 15.4144 19.0625 15V5C19.0625 4.5856 18.8979 4.18817 18.6049 3.89515C18.3118 3.60212 17.9144 3.4375 17.5 3.4375ZM17.1875 14.6875H2.8125V5.3125H17.1875V14.6875ZM3.75 10C3.75 9.75136 3.84877 9.5129 4.02459 9.33709C4.2004 9.16127 4.43886 9.0625 4.6875 9.0625H5.9375C6.18614 9.0625 6.4246 9.16127 6.60041 9.33709C6.77623 9.5129 6.875 9.75136 6.875 10C6.875 10.2486 6.77623 10.4871 6.60041 10.6629C6.4246 10.8387 6.18614 10.9375 5.9375 10.9375H4.6875C4.43886 10.9375 4.2004 10.8387 4.02459 10.6629C3.84877 10.4871 3.75 10.2486 3.75 10ZM8.125 10C8.125 9.75136 8.22377 9.5129 8.39959 9.33709C8.5754 9.16127 8.81386 9.0625 9.0625 9.0625H15.3125C15.5611 9.0625 15.7996 9.16127 15.9754 9.33709C16.1512 9.5129 16.25 9.75136 16.25 10C16.25 10.2486 16.1512 10.4871 15.9754 10.6629C15.7996 10.8387 15.5611 10.9375 15.3125 10.9375H9.0625C8.81386 10.9375 8.5754 10.8387 8.39959 10.6629C8.22377 10.4871 8.125 10.2486 8.125 10ZM3.75 12.8125C3.75 12.5639 3.84877 12.3254 4.02459 12.1496C4.2004 11.9738 4.43886 11.875 4.6875 11.875H10.9375C11.1861 11.875 11.4246 11.9738 11.6004 12.1496C11.7762 12.3254 11.875 12.5639 11.875 12.8125C11.875 13.0611 11.7762 13.2996 11.6004 13.4754C11.4246 13.6512 11.1861 13.75 10.9375 13.75H4.6875C4.43886 13.75 4.2004 13.6512 4.02459 13.4754C3.84877 13.2996 3.75 13.0611 3.75 12.8125ZM16.25 12.8125C16.25 13.0611 16.1512 13.2996 15.9754 13.4754C15.7996 13.6512 15.5611 13.75 15.3125 13.75H14.0625C13.8139 13.75 13.5754 13.6512 13.3996 13.4754C13.2238 13.2996 13.125 13.0611 13.125 12.8125C13.125 12.5639 13.2238 12.3254 13.3996 12.1496C13.5754 11.9738 13.8139 11.875 14.0625 11.875H15.3125C15.5611 11.875 15.7996 11.9738 15.9754 12.1496C16.1512 12.3254 16.25 12.5639 16.25 12.8125Z" />
            </svg>
          </div>
        </button>
        <div className={labelClass}>Script</div>
      </div>

      {/* 파일 아이콘 (Files) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleFilePanel, isFilePanelOpen)}
          className={getButtonClass(isFilePanelOpen)}
          title="Files"
        >
          <div className={iconContainerClass}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
              <path d="M14 3V7C14 7.26522 14.1054 7.51957 14.2929 7.70711C14.4804 7.89464 14.7348 8 15 8H19" />
              <path d="M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H14L19 8V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" />
            </svg>
          </div>
        </button>
        <div className={labelClass}>Files</div>
      </div>

      {/* 필기바 토글 아이콘 (Drawing) - 4번째 위치 */}
      <div className={buttonWrapperClass}>
        <button
          onClick={toggleDrawingSidebar}
          className={getButtonClass(isDrawingSidebarOpen)}
          title={isDrawingSidebarOpen ? "Hide Drawing Bar" : "Show Drawing Bar"}
        >
          <div className={iconContainerClass}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
              <path opacity="0.2" d="M21 11.9999C20.9996 10.4202 20.5835 8.86836 19.7933 7.50042C19.0032 6.13248 17.8669 4.99661 16.4987 4.20697C15.1305 3.41732 13.5785 3.00173 11.9987 3.00195C10.419 3.00217 8.86713 3.4182 7.49912 4.20823C6.13111 4.99826 4.99515 6.13444 4.20539 7.50261C3.41564 8.87077 2.99991 10.4227 3 12.0025C3.00009 13.5822 3.41599 15.1341 4.2059 16.5022C4.99581 17.8702 6.1319 19.0063 7.5 19.7962V16.4999L12 6.74993L16.5 16.4999V19.7962C17.8685 19.0061 19.0048 17.8696 19.7947 16.5011C20.5847 15.1325 21.0004 13.5801 21 11.9999Z" />
              <path d="M18.8945 5.10574C17.066 3.27724 14.586 2.25 12.0001 2.25C9.41423 2.25 6.93425 3.27724 5.10574 5.10574C3.27724 6.93425 2.25 9.41423 2.25 12.0001C2.25 14.586 3.27724 17.066 5.10574 18.8945C6.93425 20.723 9.41423 21.7502 12.0001 21.7502C14.586 21.7502 17.066 20.723 18.8945 18.8945C20.723 17.066 21.7502 14.586 21.7502 12.0001C21.7502 9.41423 20.723 6.93425 18.8945 5.10574ZM8.25012 18.0001C8.25012 17.6023 8.40815 17.2208 8.68946 16.9395C8.97076 16.6582 9.35229 16.5001 9.75012 16.5001C10.1479 16.5001 10.5295 16.6582 10.8108 16.9395C11.0921 17.2208 11.2501 17.6023 11.2501 18.0001V20.2117C10.2042 20.1171 9.18599 19.8237 8.25012 19.3473V18.0001ZM12.7501 18.0001C12.7501 17.6023 12.9082 17.2208 13.1895 16.9395C13.4708 16.6582 13.8523 16.5001 14.2501 16.5001C14.6479 16.5001 15.0295 16.6582 15.3108 16.9395C15.5921 17.2208 15.7501 17.6023 15.7501 18.0001V19.3473C14.8142 19.8237 13.796 20.1171 12.7501 20.2117V18.0001ZM10.0567 12.7501H13.9436L15.0292 15.1032C14.4891 14.9577 13.9191 14.9663 13.3837 15.1282C12.8483 15.2901 12.369 15.5988 12.0001 16.0192C11.6312 15.5988 11.1519 15.2901 10.6165 15.1282C10.0811 14.9663 9.5111 14.9577 8.97106 15.1032L10.0567 12.7501ZM10.7495 11.2501L12.0001 8.53981L13.2507 11.2501H10.7495ZM17.8332 17.8342C17.6457 18.0217 17.4507 18.197 17.2501 18.3629V16.5001C17.2502 16.3916 17.2266 16.2844 17.1807 16.1861L12.6807 6.43606C12.6206 6.30617 12.5246 6.19619 12.404 6.11912C12.2834 6.04205 12.1432 6.00109 12.0001 6.00109C11.857 6.00109 11.7169 6.04205 11.5962 6.11912C11.4756 6.19619 11.3796 6.30617 11.3195 6.43606L6.81949 16.1861C6.77367 16.2844 6.74999 16.3916 6.75012 16.5001V18.3629C6.54949 18.197 6.35449 18.0217 6.16699 17.8342C5.01307 16.6805 4.22719 15.2104 3.90874 13.6101C3.5903 12.0097 3.75359 10.3508 4.37798 8.84324C5.00236 7.33566 6.05978 6.0471 7.41651 5.14052C8.77325 4.23393 10.3684 3.75004 12.0001 3.75004C13.6319 3.75004 15.227 4.23393 16.5837 5.14052C17.9405 6.0471 18.9979 7.33566 19.6223 8.84324C20.2466 10.3508 20.4099 12.0097 20.0915 13.6101C19.773 15.2104 18.9872 16.6805 17.8332 17.8342Z" />
            </svg>
          </div>
        </button>
        <div className={labelClass}>Drawing</div>
      </div>

      {/* 챗봇 아이콘 (AI Chat) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleChatbotPanel, isChatbotPanelOpen)}
          className={getButtonClass(isChatbotPanelOpen)}
          title="AI Chat"
        >
          <div className={iconContainerClass}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
              <path d="M6 6C6 5.46957 6.21071 4.96086 6.58579 4.58579C6.96086 4.21071 7.46957 4 8 4H16C16.5304 4 17.0391 4.21071 17.4142 4.58579C17.7893 4.96086 18 5.46957 18 6V10C18 10.5304 17.7893 11.0391 17.4142 11.4142C17.0391 11.7893 16.5304 12 16 12H8C7.46957 12 6.96086 11.7893 6.58579 11.4142C6.21071 11.0391 6 10.5304 6 10V6Z" />
              <path d="M12 2V4" />
              <path d="M9 12V21" />
              <path d="M15 12V21" />
              <path d="M5 16L9 14" />
              <path d="M15 14L19 16" />
              <path d="M9 18H15" />
              <path d="M10 8V8.01" />
              <path d="M14 8V8.01" />
            </svg>
          </div>
        </button>
        <div className={labelClass}>Chatbot</div>
      </div>

      {/* 협업 아이콘 (Collaboration) - 교육자 노트만 */}
      {isEducatorNote && (
        <div className={buttonWrapperClass}>
          <button
            onClick={() => handlePanelToggle(toggleCollaborationPanel, isCollaborationPanelOpen)}
            className={getButtonClass(isCollaborationPanelOpen)}
            title="Collaborate"
          >
            <div className={iconContainerClass}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
                <path d="M4.5 15.75V15H3V15.75C3 17.1424 3.55312 18.4777 4.53769 19.4623C5.52226 20.4469 6.85761 21 8.25 21H10.5V19.5H8.25C7.25544 19.5 6.30161 19.1049 5.59835 18.4017C4.89509 17.6984 4.5 16.7446 4.5 15.75Z" />
                <path d="M18 8.25V9H19.5V8.25C19.5 6.85761 18.9469 5.52226 17.9623 4.53769C16.9777 3.55312 15.6424 3 14.25 3H12V4.5H14.25C14.7425 4.5 15.2301 4.597 15.6851 4.78545C16.14 4.97391 16.5534 5.25013 16.9017 5.59835C17.2499 5.94657 17.5261 6.35997 17.7145 6.81494C17.903 7.26991 18 7.75754 18 8.25Z" />
                <path d="M8.25 8.25H3.75C3.15326 8.25 2.58097 8.48705 2.15901 8.90901C1.73705 9.33097 1.5 9.90326 1.5 10.5V12H3V10.5C3 10.3011 3.07902 10.1103 3.21967 9.96967C3.36032 9.82902 3.55109 9.75 3.75 9.75H8.25C8.44891 9.75 8.63968 9.82902 8.78033 9.96967C8.92098 10.1103 9 10.3011 9 10.5V12H10.5V10.5C10.5 9.90326 10.2629 9.33097 9.84099 8.90901C9.41903 8.48705 8.84674 8.25 8.25 8.25Z" />
                <path d="M6 7.5C6.59334 7.5 7.17336 7.32405 7.66671 6.99441C8.16006 6.66477 8.54458 6.19623 8.77164 5.64805C8.9987 5.09987 9.05811 4.49667 8.94236 3.91473C8.8266 3.33279 8.54088 2.79824 8.12132 2.37868C7.70176 1.95912 7.16721 1.6734 6.58527 1.55765C6.00333 1.44189 5.40013 1.5013 4.85195 1.72836C4.30377 1.95543 3.83524 2.33994 3.50559 2.83329C3.17595 3.32664 3 3.90666 3 4.5C3 5.29565 3.31607 6.05871 3.87868 6.62132C4.44129 7.18393 5.20435 7.5 6 7.5ZM6 3C6.29667 3 6.58668 3.08797 6.83336 3.2528C7.08003 3.41762 7.27229 3.65189 7.38582 3.92598C7.49935 4.20007 7.52906 4.50167 7.47118 4.79264C7.4133 5.08361 7.27044 5.35088 7.06066 5.56066C6.85088 5.77044 6.58361 5.9133 6.29264 5.97118C6.00166 6.02906 5.70006 5.99935 5.42597 5.88582C5.15189 5.77229 4.91762 5.58003 4.7528 5.33336C4.58797 5.08668 4.5 4.79667 4.5 4.5C4.5 4.10218 4.65804 3.72065 4.93934 3.43934C5.22064 3.15804 5.60218 3 6 3Z" />
                <path d="M20.25 18.75H15.75C15.1533 18.75 14.581 18.9871 14.159 19.409C13.7371 19.831 13.5 20.4033 13.5 21V22.5H15V21C15 20.8011 15.079 20.6103 15.2197 20.4697C15.3603 20.329 15.5511 20.25 15.75 20.25H20.25C20.4489 20.25 20.6397 20.329 20.7803 20.4697C20.921 20.6103 21 20.8011 21 21V22.5H22.5V21C22.5 20.4033 22.2629 19.831 21.841 19.409C21.419 18.9871 20.8467 18.75 20.25 18.75Z" />
                <path d="M15 15C15 15.5933 15.1759 16.1734 15.5056 16.6667C15.8352 17.1601 16.3038 17.5446 16.852 17.7716C17.4001 17.9987 18.0033 18.0581 18.5853 17.9424C19.1672 17.8266 19.7018 17.5409 20.1213 17.1213C20.5409 16.7018 20.8266 16.1672 20.9424 15.5853C21.0581 15.0033 20.9987 14.4001 20.7716 13.852C20.5446 13.3038 20.1601 12.8352 19.6667 12.5056C19.1734 12.1759 18.5933 12 18 12C17.2044 12 16.4413 12.3161 15.8787 12.8787C15.3161 13.4413 15 14.2044 15 15ZM19.5 15C19.5 15.2967 19.412 15.5867 19.2472 15.8334C19.0824 16.08 18.8481 16.2723 18.574 16.3858C18.2999 16.4994 17.9983 16.5291 17.7074 16.4712C17.4164 16.4133 17.1491 16.2704 16.9393 16.0607C16.7296 15.8509 16.5867 15.5836 16.5288 15.2926C16.4709 15.0017 16.5006 14.7001 16.6142 14.426C16.7277 14.1519 16.92 13.9176 17.1666 13.7528C17.4133 13.588 17.7033 13.5 18 13.5C18.3978 13.5 18.7794 13.658 19.0607 13.9393C19.342 14.2206 19.5 14.6022 19.5 15Z" />
              </svg>
            </div>
          </button>
          <div className={labelClass}>Collab</div>
        </div>
      )}
    </motion.div>
  );
}
