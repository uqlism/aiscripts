
import { state, computed, effect, batch, noReactive } from './kiwi/core'
import { container, folder, text, mfm, button, buttons, toggle, textInput, textarea, select, postForm, postFormButton, show, div, click } from './kiwi/component'
export type { Mfm } from './kiwi/component'
import { persist } from './kiwi/persist'
import { createRouter } from './kiwi/router'

export const kiwi = {
    // Reactivity
    state,
    computed,
    effect,
    batch,
    noReactive,

    // Persistence
    persist,

    // UI Components
    container,
    folder,
    text,
    mfm,
    button,
    buttons,
    toggle,
    textInput,
    textarea,
    select,
    postForm,
    postFormButton,
    show,
    div,
    click,

    // App / Routing
    app: createRouter,
}
