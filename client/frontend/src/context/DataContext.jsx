import { ProjectProvider, useProject } from './ProjectContext'

// Provide a DataProvider alias and a useData hook to match requested API
export const DataProvider = ({ children }) => {
  return (
    <ProjectProvider>
      {children}
    </ProjectProvider>
  )
}

export const useData = () => useProject()

export default DataProvider
