import React from 'react'

const Table = ({ columns, data, isLoading, emptyMessage = 'No data available' }) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0 table-responsive">
      <table className="table min-w-full">
        <thead>
          <tr>
            {columns.map((col, index) => {
              // Use key, accessor, or index as fallback for React key prop
              const colKey = col.key || col.accessor || `col-${index}`;
              return (
                <th key={colKey} className={col.className || ''}>
                  {col.header || col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            // Use _id if available, otherwise use index
            const rowKey = row._id || row.id || rowIndex;
            return (
              <tr key={rowKey}>
                {columns.map((col, colIndex) => {
                  // Use key, accessor, or index as fallback for React key prop
                  const colKey = col.key || col.accessor || `col-${colIndex}`;
                  // Get the raw value from the row
                  const rawValue = row[col.accessor || col.key];
                  
                  // Support both 'render' and 'cell' props
                  let cellValue;
                  if (col.render) {
                    // If render function expects value (not row), pass the value
                    // Otherwise, pass the row for backward compatibility
                    cellValue = col.render(rawValue, row, rowIndex);
                  } else if (col.cell) {
                    cellValue = col.cell(row);
                  } else {
                    // For direct value access, ensure it's renderable
                    cellValue = rawValue;
                  }
                  
                  // Ensure the cell value is renderable (not an object)
                  if (cellValue !== null && cellValue !== undefined && typeof cellValue === 'object' && !React.isValidElement(cellValue)) {
                    // Convert objects to string representation
                    cellValue = JSON.stringify(cellValue);
                  }
                  
                  // Handle null/undefined - render as empty string
                  if (cellValue === null || cellValue === undefined) {
                    cellValue = '';
                  }
                  
                  return (
                    <td key={colKey} className={col.className || ''}>
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Table
