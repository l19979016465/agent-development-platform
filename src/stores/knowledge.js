import { defineStore } from 'pinia'
import {
  listKnowledgeBasesApi,
  createKnowledgeBaseApi,
  deleteKnowledgeBaseApi,
  getKnowledgeBaseApi,
  listDocumentsApi,
  getDocumentApi,
  uploadDocumentApi,
  updateDocTagsApi,
  deleteDocumentApi,
  hitTestApi,
} from '../api/knowledge'

export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    /** 知识库列表 */
    list: [],
    listLoading: false,

    /** 当前知识库 */
    current: null,
    /** 当前知识库下的文档 */
    documents: [],
    docsLoading: false,

    /** 当前查看的文档（含正文与切片） */
    activeDoc: null,
    /** 当前选中的切片 id（用于原文高亮） */
    activeChunkId: null,

    /** 命中测试结果 */
    hitResult: null,
    hitLoading: false,
  }),

  getters: {
    /** 当前文档的全部切片 */
    chunks: (state) => state.activeDoc?.chunks || [],

    /** 选中的切片对象 */
    activeChunk: (state) => {
      if (!state.activeDoc || !state.activeChunkId) return null
      return state.activeDoc.chunks.find((c) => c.id === state.activeChunkId) || null
    },
  },

  actions: {
    async fetchList() {
      this.listLoading = true
      try {
        this.list = await listKnowledgeBasesApi()
      } finally {
        this.listLoading = false
      }
    },

    async create(data) {
      await createKnowledgeBaseApi(data)
      await this.fetchList()
    },

    async remove(id) {
      await deleteKnowledgeBaseApi(id)
      if (this.current?.id === id) {
        this.current = null
        this.documents = []
      }
      await this.fetchList()
    },

    /** 进入知识库详情 */
    async openKnowledgeBase(id) {
      this.activeDoc = null
      this.activeChunkId = null
      this.hitResult = null
      this.current = await getKnowledgeBaseApi(id)
      await this.fetchDocuments()
    },

    async fetchDocuments() {
      if (!this.current) return
      this.docsLoading = true
      try {
        this.documents = await listDocumentsApi(this.current.id)
      } finally {
        this.docsLoading = false
      }
    },

    /** 查看某个文档的切片 */
    async openDocument(docId) {
      this.activeChunkId = null
      this.activeDoc = await getDocumentApi(docId)
      // 默认选中第一个切片，便于直接看到原文定位效果
      this.activeChunkId = this.activeDoc.chunks[0]?.id || null
    },

    selectChunk(chunkId) {
      this.activeChunkId = chunkId
    },

    async upload(payload) {
      await uploadDocumentApi(payload)
      await this.fetchDocuments()
      await this.fetchList() // 同步更新列表上的文档数/切片数
      // 等待模拟解析完成后刷新文档状态
      setTimeout(() => this.fetchDocuments(), 2300)
    },

    async updateTags(docId, tags) {
      await updateDocTagsApi(docId, tags)
      await this.fetchDocuments()
      if (this.activeDoc?.id === docId) this.activeDoc.tags = tags
    },

    async removeDocument(docId) {
      await deleteDocumentApi(docId)
      if (this.activeDoc?.id === docId) {
        this.activeDoc = null
        this.activeChunkId = null
      }
      await this.fetchDocuments()
      await this.fetchList()
    },

    async runHitTest(query, options) {
      if (!this.current) return
      this.hitLoading = true
      try {
        this.hitResult = await hitTestApi(this.current.id, query, options)
      } finally {
        this.hitLoading = false
      }
    },
  },
})
