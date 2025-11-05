import { kiwi } from "./kiwi"

const money = kiwi.state(0)
const todos = kiwi.state<string[]>([])
const todo = kiwi.state<string>("")
const hidden = kiwi.state(false)

Async.timeout(1000, () => {
  money.set(100)
})

kiwi.effect(() => {
  Mk.toast(`${hidden.get()}`)
  return true
})

Ui.render(
  [
    kiwi.container({
      hidden: () => hidden.get(),
      children: [
        kiwi.text({ text: () => `${money.get()} 円持っています`, }),
        Ui.C.button({ text: `バイト`, onClick() { money.set(money.get() + 1) }, }),
        Ui.C.container({
          children: [
            Ui.C.button({ text: `買い物`, onClick() { money.set(money.get() - 10) }, }),
          ]
        })
      ]
    }),
    kiwi.container({
      hidden: () => !hidden.get(),
      children: [
        kiwi.textInput({ onInput(text) { todo.set(text) }, default: todo.get }),
        Ui.C.button({
          text: `リストに追加`,
          onClick() {
            const td = todos.get()
            td.push(todo.get())
            todo.set("")
            todos.set(td)
          },
        }),
        kiwi.container({
          children() {
            return todos.get().map((x, index) =>
              Ui.C.container({
                borderWidth: 1,
                children: [
                  Ui.C.text({ text: x }),
                  Ui.C.button({
                    text: "削除",
                    onClick() {
                      todos.set(todos.get().filter((_, i) => i !== index))
                    },
                  })
                ]
              })
            )
          }
        })
      ]
    }),
    kiwi.button({
      text: () => hidden.get() ? "MONEY" : "TODO",
      rounded: () => hidden.get(),
      onClick() {
        hidden.set(!hidden.get())
      },
    }),
  ]
)
