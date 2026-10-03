path = r'C:\Users\SYLLA\Desktop\salesboard-saas-main\src\features\ventes\pages\VentesPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter imports
old1 = "import { useEffect, useMemo, useState } from 'react';"
new1 = ("import { useEffect, useMemo, useState } from 'react';\n"
        "import Pagination from '../../../components/Pagination';\n"
        "import { usePagination } from '../../../hooks/usePagination';\n"
        "import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';")
content = content.replace(old1, new1, 1)

# 2. Ajouter états search, isDirty et hooks après les useState existants
old2 = ("  const [expandedSaleId, setExpandedSaleId] = useState(null);\n"
        "  const [selectedProduitStatsId, setSelectedProduitStatsId] = useState('');")
new2 = ("  const [expandedSaleId, setExpandedSaleId] = useState(null);\n"
        "  const [selectedProduitStatsId, setSelectedProduitStatsId] = useState('');\n"
        "  const [search, setSearch] = useState('');\n"
        "  const [filterStatut, setFilterStatut] = useState('');\n"
        "  const [isDirty, setIsDirty] = useState(false);\n\n"
        "  // Bloquer navigation si formulaire en cours\n"
        "  useUnsavedChangesGuard(isDirty);\n\n"
        "  // Filtrage ventes\n"
        "  const filteredVentes = useMemo(() => {\n"
        "    return ventes.filter((v) => {\n"
        "      const q = search.toLowerCase();\n"
        "      const matchSearch = !q ||\n"
        "        (v.nomClient || '').toLowerCase().includes(q) ||\n"
        "        (v.prenomClient || '').toLowerCase().includes(q) ||\n"
        "        (v.telephone || '').toLowerCase().includes(q) ||\n"
        "        v.lignes.some((l) => (l.nomProduit || '').toLowerCase().includes(q));\n"
        "      const matchStatut = !filterStatut || v.statut === filterStatut;\n"
        "      return matchSearch && matchStatut;\n"
        "    });\n"
        "  }, [ventes, search, filterStatut]);\n\n"
        "  // Pagination ventes\n"
        "  const pagination = usePagination(filteredVentes, 15);")
content = content.replace(old2, new2, 1)

# 3. Marquer isDirty dans handleChange
old3 = ("  function handleChange(e) {\n"
        "    const { name, value } = e.target;\n"
        "    setForm((prev) => ({")
new3 = ("  function handleChange(e) {\n"
        "    const { name, value } = e.target;\n"
        "    setIsDirty(true);\n"
        "    setForm((prev) => ({")
content = content.replace(old3, new3, 1)

# 4. Marquer isDirty dans handleLineChange
old4 = ("  function handleLineChange(index, field, value) {\n"
        "    setForm((prev) => {")
new4 = ("  function handleLineChange(index, field, value) {\n"
        "    setIsDirty(true);\n"
        "    setForm((prev) => {")
content = content.replace(old4, new4, 1)

# 5. Nettoyer isDirty dans resetForm
old5 = ("  function resetForm() {\n"
        "    setForm(initialForm);\n"
        "    setEditingId(null);\n"
        "  }")
new5 = ("  function resetForm() {\n"
        "    setForm(initialForm);\n"
        "    setEditingId(null);\n"
        "    setIsDirty(false);\n"
        "  }")
content = content.replace(old5, new5, 1)

# 6. Nettoyer isDirty après soumission réussie
old6 = ("      resetForm();\n"
        "      await loadData();\n"
        "    } catch (err) {\n"
        "      setError(err.message || 'Erreur lors de l\u2019enregistrement de la vente');")
new6 = ("      setIsDirty(false);\n"
        "      resetForm();\n"
        "      await loadData();\n"
        "    } catch (err) {\n"
        "      setError(err.message || 'Erreur lors de l\u2019enregistrement de la vente');")
content = content.replace(old6, new6, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('STEP1 DONE')
