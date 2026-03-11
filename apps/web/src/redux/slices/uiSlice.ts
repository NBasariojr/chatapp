// web/src/redux/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  activeModal: 'newRoom' | 'profile' | null;
}

const initialState: UIState = {
  sidebarOpen: true,
  activeModal: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    openModal(state, action: PayloadAction<UIState['activeModal']>) {
      state.activeModal = action.payload;
    },
    closeModal(state) {
      state.activeModal = null;
    },
  },
});

export const { toggleSidebar, openModal, closeModal } = uiSlice.actions;
export default uiSlice.reducer;