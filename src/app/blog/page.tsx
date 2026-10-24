'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCado } from '@/context/CadoContext';
import { 
  BookOpen, 
  Search, 
  Clock, 
  User, 
  ArrowRight, 
  HeartHandshake, 
  Sparkles
} from 'lucide-react';

export default function BlogPage() {
  const { blogPosts } = useCado();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const categories = ['Todos', 'Miedo Dental', 'Cuidados', 'Bruxismo', 'Urgencias'];

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return blogPosts.filter((post) => {
      const matchCat = selectedCategory === 'Todos' || post.category === selectedCategory;
      const matchQuery = 
        !q || 
        post.title.toLowerCase().includes(q) || 
        post.excerpt.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q);
      return matchCat && matchQuery && post.published;
    });
  }, [blogPosts, selectedCategory, searchQuery]);

  return (
    <div className="bg-white text-gray-800 space-y-10 sm:space-y-14 pb-24 max-w-5xl mx-auto px-6 pt-10 sm:pt-14">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2E7E7] pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F8F8] border border-[#B3BFBF] text-xs font-semibold text-[#513D49]">
            <BookOpen className="w-3.5 h-3.5 text-[#A14B92]" />
            <span>Educación sin Miedos</span>
          </div>
          
          <div className="space-y-1">
            <span className="font-script text-2xl text-[#A14B92] block">Artículos y Consejos</span>
            <h1 className="font-title font-bold text-3xl sm:text-4xl text-[#513D49]">
              Blog de Salud Oral en Calama
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 max-w-xl font-sans">
            Este espacio reúne contenido educativo sobre salud oral. Las publicaciones se mostrarán cuando el Dr. Javier Beiza revise y apruebe sus textos.
          </p>
        </div>

        {/* BUSCADOR DE ARTÍCULOS */}
        <div className="relative w-full md:w-72 font-sans">
          <Search className="w-4 h-4 text-gray-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar artículos"
            placeholder="Buscar artículos..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#B3BFBF] text-xs text-[#513D49] focus:outline-none focus:ring-2 focus:ring-[#A14B92]/30 bg-white"
          />
        </div>
      </div>

      {/* 2. CATEGORÍAS */}
      <div className="flex flex-wrap gap-2 text-xs font-sans">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-[#A14B92] text-white shadow-xs font-bold'
                : 'bg-white border border-[#B3BFBF] text-gray-700 hover:bg-[#F8FAFA]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3. GRID DE ARTÍCULOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPosts.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-[#F8FAFA] rounded-3xl border border-[#E2E7E7] space-y-2">
            <p className="text-sm text-gray-600 font-medium font-sans">
              {blogPosts.some(post => post.published) ? 'No se encontraron artículos en esta categoría o búsqueda.' : 'Los artículos educativos estarán disponibles después de su revisión profesional.'}
            </p>
            <button
              type="button"
              onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); }}
              className="text-xs text-[#A14B92] font-bold hover:underline font-sans"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-[#E2E7E7] p-6 space-y-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#A14B92] font-bold uppercase tracking-wider border border-purple-200">
                    {post.category}
                  </span>
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </span>
                </div>

                <h2 className="font-title font-bold text-lg text-[#513D49] leading-snug">
                  {post.title}
                </h2>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 font-sans">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E7E7] flex items-center justify-between font-sans">
                <span className="text-[11px] text-gray-600">{post.date}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-xs font-bold text-[#A14B92] hover:underline flex items-center gap-1"
                >
                  <span>Leer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

    </div>
  );
}
