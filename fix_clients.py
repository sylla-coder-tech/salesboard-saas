path = r'C:\Users\SYLLA\Desktop\salesboard-saas-main\src\features\clients\pages\ClientsPage.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remplacer clients.map par pagination.paginatedItems.map dans le tableau desktop
old1 = '                  {clients.map((client) => ('
new1 = '                  {pagination.paginatedItems.map((client) => ('
content = content.replace(old1, new1, 1)

# 2. Remplacer clients.map par pagination.paginatedItems.map dans la liste mobile
old2 = '              {clients.map((client) => ('
new2 = '              {pagination.paginatedItems.map((client) => ('
content = content.replace(old2, new2, 1)

# 3. Ajouter <Pagination> après la liste mobile (avant le </> de fermeture du bloc)
old3 = '''            </div>
          </>
        )}
      </section>

      {deleteModalOpen'''
new3 = '''            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={filteredClients.length}
              pageSize={pagination.pageSize}
              onPrev={pagination.prevPage}
              onNext={pagination.nextPage}
              onGoTo={pagination.goToPage}
            />
          </>
        )}
      </section>

      {deleteModalOpen'''
content = content.replace(old3, new3, 1)

# 4. Ajouter message si aucun résultat de recherche
old4 = '        ) : (\n          <>\n            <div className="table-wrap clients-table-desktop">'
new4 = '        ) : filteredClients.length === 0 ? (\n          <p>Aucun client ne correspond à votre recherche.</p>\n        ) : (\n          <>\n            <div className="table-wrap clients-table-desktop">'
content = content.replace(old4, new4, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('DONE')
