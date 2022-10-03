export function makeRowsSelectable(tableElement, selectionChanged = () => null) {
  tableElement.querySelectorAll("tbody tr").forEach(row => {
    if (row.querySelector(".checkbox"))
      return;

    let td = document.createElement("td")
    td.innerHTML = `<label class="checkbox">
                            <input type="checkbox" class="rowselector"/>
                            <span></span>
                        </label>`
    row.prepend(td)
  })

  if (!tableElement.classList.contains("rowsselectableenabled")) {
    tableElement.addEventListener("change", (evt) => {
      if (evt.target.tagName == "INPUT" && evt.target.classList.contains("rowselector")) {
        evt.target.parentElement.parentElement.parentElement.classList.toggle("selected")
        selectionChanged(Array.from(tableElement.querySelectorAll("tbody tr.selected")))
      }
    })
    tableElement.classList.add("rowsselectableenabled")
  }

  return {
    getSelected: () => Array.from(tableElement.querySelectorAll("tbody tr.selected")),
    clear: () => tableElement.querySelectorAll("tbody tr.selected").forEach(e => {
      e.classList.toggle("selected")
      e.querySelector("td:first-child input").checked = false;
      selectionChanged(Array.from(tableElement.querySelectorAll("tbody tr.selected")))
    }),
    selectAll: () => tableElement.querySelectorAll("tbody tr:not(.selected)").forEach(e => {
      e.classList.toggle("selected")
      e.querySelector("td:first-child input").checked = true;
      selectionChanged(Array.from(tableElement.querySelectorAll("tbody tr.selected")))
    }),
    setSelection: selectedIndices => {
      tableElement.querySelectorAll("tbody tr").forEach((e, idx) => {
        let isSelected = selectedIndices.includes(idx)
        e.classList.toggle("selected", isSelected)
        e.querySelector("td:first-child input").checked = isSelected;
        selectionChanged(Array.from(tableElement.querySelectorAll("tbody tr.selected")))
      })
    }
  }
}