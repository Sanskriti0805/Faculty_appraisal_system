import os
import re

directory = "src/pages"

for filename in os.listdir(directory):
    if filename.endswith(".jsx"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # For AwardsHonours and similar forms parsing 'formData.evidenceFile'
        if "formData.evidenceFile ? formData.evidenceFile.name" in content:
            new_content = content.replace(
                "{formData.evidenceFile ? formData.evidenceFile.name : 'Click to upload evidence'}\n                  </span>",
                "{formData.evidenceFile ? formData.evidenceFile.name : 'Click to upload evidence'}\n                  </span>\n                  {formData.evidenceFile && (\n                    <button\n                      onClick={(e) => {\n                        e.preventDefault();\n                        e.stopPropagation();\n                        window.open(URL.createObjectURL(formData.evidenceFile), '_blank');\n                      }}\n                      style={{\n                        padding: '4px 12px',\n                        backgroundColor: '#e7f3ff',\n                        color: '#0066cc',\n                        border: '1px solid #b3d9ff',\n                        borderRadius: '4px',\n                        fontSize: '0.875rem',\n                        cursor: 'pointer',\n                        marginTop: '4px',\n                        zIndex: 10\n                      }}\n                    >\n                      Preview \n                    </button>\n                  )}"
            )
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filename} for formData.evidenceFile")
                
        # For PaperReview and others using 'evidenceFile ? evidenceFile.name'
        elif "evidenceFile ? evidenceFile.name :" in content and "formData.evidenceFile" not in content:
            new_content = content.replace(
                "{evidenceFile ? evidenceFile.name : 'Upload Evidence (PDF)'}\n                  </span>",
                "{evidenceFile ? evidenceFile.name : 'Upload Evidence (PDF)'}\n                  </span>\n                  {evidenceFile && (\n                    <button\n                      onClick={(e) => {\n                        e.preventDefault();\n                        e.stopPropagation();\n                        window.open(URL.createObjectURL(evidenceFile), '_blank');\n                      }}\n                      style={{\n                        padding: '4px 12px',\n                        backgroundColor: '#e7f3ff',\n                        color: '#0066cc',\n                        border: '1px solid #b3d9ff',\n                        borderRadius: '4px',\n                        fontSize: '0.875rem',\n                        cursor: 'pointer',\n                        marginTop: '4px',\n                        zIndex: 10\n                      }}\n                    >\n                      Preview\n                    </button>\n                  )}"
            )
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filename} for evidenceFile")

