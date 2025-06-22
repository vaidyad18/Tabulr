import "./App.css";
import React, { useState, useEffect, useRef } from "react";

const getColumnLabel = (index) => {
  let label = "";
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
};

const App = ({
  rows: initialRows = 15,
  cols: initialCols = 18,
  initialData = {},
}) => {
  const [data, setData] = useState(initialData);
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const [colWidths, setColWidths] = useState(Array(initialCols).fill(96));
  const [rowHeights, setRowHeights] = useState(Array(initialRows).fill(40));
  const [selectedRange, setSelectedRange] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // default to ascending
  const [formattingState, setFormattingState] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  
  const refs = useRef({});

  const focusCell = (row, col) => {
    const key = `${row}-${col}`;
    const el = refs.current[key];
    if (el) el.focus();
  };
  const updateFormattingState = () => {
    setFormattingState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const handleFormat = (command) => {
    document.execCommand(command);
    // Force update the formatting state after applying the command
    setTimeout(() => {
      setFormattingState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    }, 0);
  };
  
  
  useEffect(() => {
    document.addEventListener("selectionchange", updateFormattingState);
    return () => {
      document.removeEventListener("selectionchange", updateFormattingState);
    };
  }, []);
  
  useEffect(() => {
    focusCell(focusedCell.row, focusedCell.col);
  }, [focusedCell]);

  const handleKeyDown = (e, row, col) => {
    let newRow = row;
    let newCol = col;
    switch (e.key) {
      case "ArrowUp":
        newRow = row > 0 ? row - 1 : row;
        break;
      case "ArrowDown":
        newRow = row < rows - 1 ? row + 1 : row;
        break;
      case "ArrowLeft":
        newCol = col > 0 ? col - 1 : col;
        break;
      case "ArrowRight":
        newCol = col < cols - 1 ? col + 1 : col;
        break;
      case "Tab":
        e.preventDefault();
        newCol = col < cols - 1 ? col + 1 : 0;
        newRow = col < cols - 1 ? row : row + 1;
        if (newRow >= rows) newRow = rows - 1;
        break;
      default:
        return;
    }
    setFocusedCell({ row: newRow, col: newCol });
  };

  const handleChange = (e, row, col) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, [`${row}-${col}`]: value }));
  };

  const addRowAt = (index) => {
    const newData = {};
    for (let r = 0; r < rows + 1; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < index) newData[`${r}-${c}`] = data[`${r}-${c}`] || "";
        else if (r === index) newData[`${r}-${c}`] = "";
        else newData[`${r}-${c}`] = data[`${r - 1}-${c}`] || "";
      }
    }
    setRows(rows + 1);
    setRowHeights((prev) => [
      ...prev.slice(0, index),
      40,
      ...prev.slice(index),
    ]);
    setData(newData);
  };

  const addColAt = (index) => {
    const newData = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols + 1; c++) {
        if (c < index) newData[`${r}-${c}`] = data[`${r}-${c}`] || "";
        else if (c === index) newData[`${r}-${c}`] = "";
        else newData[`${r}-${c}`] = data[`${r}-${c - 1}`] || "";
      }
    }
    setCols(cols + 1);
    setColWidths((prev) => [...prev.slice(0, index), 96, ...prev.slice(index)]);
    setData(newData);
  };

  const handleMouseDown = (type, index, e) => {
    e.preventDefault();
    const start = type === "col" ? e.clientX : e.clientY;
    const initialSize = type === "col" ? colWidths[index] : rowHeights[index];

    const onMouseMove = (moveEvent) => {
      requestAnimationFrame(() => {
        const currentPos =
          type === "col" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - start;
        const newSize = initialSize + delta;

        if (type === "col") {
          setColWidths((prev) => {
            const updated = [...prev];
            updated[index] = Math.max(40, newSize);
            return updated;
          });
        } else {
          setRowHeights((prev) => {
            const updated = [...prev];
            updated[index] = Math.max(20, newSize);
            return updated;
          });
        }
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleCellMouseDown = (startRow, startCol) => {
    const onMouseMove = (e) => {
      const endEl = document.elementFromPoint(e.clientX, e.clientY);
      const key = Object.entries(refs.current).find(
        ([, val]) => val === endEl || val?.contains(endEl)
      )?.[0];
      if (!key) return;
      const [endRow, endCol] = key.split("-").map(Number);

      setSelectedRange({
        startRow: Math.min(startRow, endRow),
        endRow: Math.max(startRow, endRow),
        startCol: Math.min(startCol, endCol),
        endCol: Math.max(startCol, endCol),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    setSelectedRange({
      startRow,
      endRow: startRow,
      startCol,
      endCol: startCol,
    });

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const isSelected = (row, col) => {
    if (!selectedRange) return false;
    const { startRow, endRow, startCol, endCol } = selectedRange;
    return (
      row >= startRow &&
      row <= endRow &&
      col >= startCol &&
      col <= endCol
    );
  };

  const sortSelected = () => {
    if (!selectedRange) return;

    const { startRow, endRow, startCol, endCol } = selectedRange;

    const comparator =
      sortOrder === "asc"
        ? (a, b) => a.localeCompare(b)
        : (a, b) => b.localeCompare(a);

    const updatedData = { ...data };

    if (startRow !== endRow) {
      for (let col = startCol; col <= endCol; col++) {
        const values = [];
        for (let row = startRow; row <= endRow; row++) {
          values.push(data[`${row}-${col}`] || "");
        }
        values.sort(comparator);
        for (let i = startRow; i <= endRow; i++) {
          updatedData[`${i}-${col}`] = values[i - startRow];
        }
      }
    } else if (startCol !== endCol) {
      for (let row = startRow; row <= endRow; row++) {
        const values = [];
        for (let col = startCol; col <= endCol; col++) {
          values.push(data[`${row}-${col}`] || "");
        }
        values.sort(comparator);
        for (let i = startCol; i <= endCol; i++) {
          updatedData[`${row}-${i}`] = values[i - startCol];
        }
      }
    }

    setData(updatedData);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc")); // toggle after sorting
  };

  return (
    <main className="app-main">
      <header className="header">
        <div className="header-title">Tabulr</div>
        <div className="formatting-buttons">
  <button
    onClick={() => handleFormat("bold")}
    className={`btn ${formattingState.bold ? "btn-active" : ""}`}
  >
    B
  </button>
  <button
    onClick={() => handleFormat("italic")}
    className={`btn ${formattingState.italic ? "btn-active" : ""}`}
  >
    I
  </button>
  <button
    onClick={() => handleFormat("underline")}
    className={`btn ${formattingState.underline ? "btn-active" : ""}`}
  >
    U
  </button>
</div>



        <div className="controls-container">
          <button onClick={() => addRowAt(focusedCell.row)} className="btn">
            Add Row
          </button>
          <button onClick={() => addColAt(focusedCell.col)} className="btn">
            Add Column
          </button>
          <button onClick={sortSelected} className="btn btn-sort">
            Sort
          </button>
        </div>

        <div className="focused-cell-info">
          Focused Cell: {getColumnLabel(focusedCell.col)}{focusedCell.row + 1}

        </div>
      </header>
      <div className="table-container">
        <div style={{ minWidth: `${cols * 96 + 48}px` }}>
          <table className="table">
            <thead>
              <tr>
                <th className="header-cell-top-left"></th>
                {Array.from({ length: cols }, (_, colIndex) => (
                  <th
                    key={colIndex}
                    style={{
                      width: colWidths[colIndex],
                      backgroundColor:
                        focusedCell.col === colIndex
                          ? "rgb(138, 212, 255)"
                          : "rgb(214, 233, 244)",
                    }}
                    className="header-cell relative-cell"
                  >
                    {getColumnLabel(colIndex)}
                    <div
                      className="col-resize-handle"
                      onMouseDown={(e) =>
                        handleMouseDown("col", colIndex, e)
                      }
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                <tr key={rowIndex} style={{ height: rowHeights[rowIndex] }}>
                  <th
                    className={`row-header-cell relative-cell ${focusedCell.row === rowIndex ? "focused-header-bg" : ""
                      }`}
                    style={{
                      backgroundColor: "rgb(214, 233, 244)",
                    }}
                  >
                    {rowIndex + 1}
                    <div
                      className="row-resize-handle"
                      onMouseDown={(e) =>
                        handleMouseDown("row", rowIndex, e)
                      }
                    />
                  </th>
                  {Array.from({ length: cols }, (_, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`;
                    return (
                      <td
                        key={colIndex}
                        className={`table-cell ${isSelected(rowIndex, colIndex)
                          ? "selected-cell"
                          : ""
                          }`}
                        style={{
                          width: colWidths[colIndex],
                          height: rowHeights[rowIndex],
                        }}
                        onMouseDown={() =>
                          handleCellMouseDown(rowIndex, colIndex)
                        }
                      >
                        <div
                          ref={(el) => (refs.current[key] = el)}
                          contentEditable
                          className="cell-input editable"
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const value = e.currentTarget.innerHTML;
                            setData((prev) => ({ ...prev, [`${rowIndex}-${colIndex}`]: value }));
                          }}
                          onFocus={() =>
                            setFocusedCell({ row: rowIndex, col: colIndex })
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, rowIndex, colIndex)
                          }
                        />


                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default App;
