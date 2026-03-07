/// <reference path="../pb_data/types.d.ts" />

migrate(
  (db) => {
    const dao = new Dao(db)

    // ── 1. Add is_admin field to built-in users collection ──────────────
    const users = dao.findCollectionByNameOrId('users')
    users.schema.addField(
      new SchemaField({
        name: 'is_admin',
        type: 'bool',
        required: false,
        options: {},
      })
    )
    dao.saveCollection(users)

    // ── 2. members collection ───────────────────────────────────────────
    const members = new Collection({
      name: 'members',
      type: 'base',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: true,
          options: { max: 200 },
        },
        {
          name: 'rank',
          type: 'number',
          required: true,
          options: { min: 1, max: 5 },
        },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_members_name ON members (name)'],
      // Any authenticated user can read; only admins write
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.is_admin = true',
      updateRule: '@request.auth.is_admin = true',
      deleteRule: '@request.auth.is_admin = true',
    })
    dao.saveCollection(members)

    // ── 3. damage_logs collection ───────────────────────────────────────
    const savedMembers = dao.findCollectionByNameOrId('members')

    const damageLogs = new Collection({
      name: 'damage_logs',
      type: 'base',
      schema: [
        {
          name: 'member_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: savedMembers.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
        },
        {
          name: 'damage',
          type: 'number',
          required: true,
          options: { min: 0 },
        },
        {
          name: 'event_date',
          type: 'date',
          required: true,
          options: {},
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
          options: { max: 500 },
        },
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.is_admin = true',
      updateRule: '@request.auth.is_admin = true',
      deleteRule: '@request.auth.is_admin = true',
    })
    dao.saveCollection(damageLogs)
  },

  // ── Down migration ──────────────────────────────────────────────────
  (db) => {
    const dao = new Dao(db)

    for (const name of ['damage_logs', 'members']) {
      try {
        dao.deleteCollection(dao.findCollectionByNameOrId(name))
      } catch (_) {
        // ignore if already gone
      }
    }

    const users = dao.findCollectionByNameOrId('users')
    users.schema.removeField(users.schema.getFieldByName('is_admin').id)
    dao.saveCollection(users)
  }
)
