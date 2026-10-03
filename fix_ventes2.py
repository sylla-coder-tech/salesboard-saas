path = r'C:\Users\SYLLA\Desktop\salesboard-saas-main\src\features\ventes\pages\VentesPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter toolbar avant le tableau liste des ventes
old1 = ('        <div className="section-head">\n'
        '          <div>\n'
        '            <h2>Liste des ventes</h2>\n'
        "            <p>Historique des ventes enregistrées pour votre entreprise.</p>\n"
        '          </div>\n'
        '        </div>\n'
        '\n'
        '        {loading ? (')

new1 = ('        <div className="section-head">\n'
        '          <div>\n'
        '            <h2>Liste des ventes</h2>\n'
        "            <p>Historique des ventes enregistrées pour votre entreprise.</p>\n"
        '          </div>\n'
        '        </div>\n'
        '\n'
        '        <div className="list-toolbar">\n'
        '          <div className="search-input-wrap">\n'
        '            <span className="search-input-icon">\U0001f50d</span>\n'
        '            <input\n'
        '              type="text"\n'
        '              placeholder="Rechercher par client, produit, téléphone..."\n'
        '              value={search}\n'
        '              onChange={(e) => { setSearch(e.target.value); pagination.resetPage(); }}\n'
        '            />\n'
        '          </div>\n'
        '          <select\n'
        '            className="list-filter-select"\n'
        '            value={filterStatut}\n'
        '            onChange={(e) => { setFilterStatut(e.target.value); pagination.resetPage(); }}\n'
        '          >\n'
        '            <option value="">Tous les statuts</option>\n'
        '            <option value="payee">Payée</option>\n'
        '            <option value="en_attente">En attente</option>\n'
        '            <option value="livree">Livrée</option>\n'
        '          </select>\n'
        '          <span className="list-count-badge">\n'
        "            {filteredVentes.length} vente{filteredVentes.length !== 1 ? 's' : ''}\n"
        '          </span>\n'
        '        </div>\n'
        '\n'
        '        {loading ? (')

content = content.replace(old1, new1, 1)

# 2. Remplacer ventes.length === 0 par filteredVentes.length === 0
old2 = ') : ventes.length === 0 ? (\n          <p>Aucune vente enregistrée pour le moment.</p>'
new2 = ') : filteredVentes.length === 0 ? (\n          <p>{search || filterStatut ? "Aucune vente ne correspond à votre recherche." : "Aucune vente enregistrée pour le moment."}</p>'
content = content.replace(old2, new2, 1)

# 3. Remplacer ventes.map dans le tableau desktop
old3 = '                  {ventes.map((vente) => ('
new3 = '                  {pagination.paginatedItems.map((vente) => ('
content = content.replace(old3, new3, 1)

# 4. Remplacer ventes.map dans la liste mobile
old4 = '              {ventes.map((vente) => {'
new4 = '              {pagination.paginatedItems.map((vente) => {'
content = content.replace(old4, new4, 1)

# 5. Ajouter <Pagination> après la liste mobile avant le </> de fermeture
old5 = ('            </div>\n'
        '          </>\n'
        '        )}\n'
        '      </section>\n'
        '\n'
        '      {deleteModalOpen')
new5 = ('            </div>\n'
        '\n'
        '            <Pagination\n'
        '              page={pagination.page}\n'
        '              totalPages={pagination.totalPages}\n'
        '              totalItems={filteredVentes.length}\n'
        '              pageSize={pagination.pageSize}\n'
        '              onPrev={pagination.prevPage}\n'
        '              onNext={pagination.nextPage}\n'
        '              onGoTo={pagination.goToPage}\n'
        '            />\n'
        '          </>\n'
        '        )}\n'
        '      </section>\n'
        '\n'
        '      {deleteModalOpen')
content = content.replace(old5, new5, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('STEP2 DONE')
