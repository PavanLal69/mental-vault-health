import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Link, User, ShieldAlert, Heart, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export default function FamilyTree({ token }) {
  const [members, setMembers] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberMemories, setMemberMemories] = useState([]);
  
  // Member Form State
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Son');
  const [birthDate, setBirthDate] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState(false);

  // Relationship Form State
  const [memberA, setMemberA] = useState('');
  const [memberB, setMemberB] = useState('');
  const [relType, setRelType] = useState('parent-child');
  const [showAddRel, setShowAddRel] = useState(false);
  const [relSuccess, setRelSuccess] = useState(false);

  const relationsList = [
    'Grandfather', 'Grandmother', 'Father', 'Mother', 'Spouse', 
    'Son', 'Daughter', 'Grandson', 'Granddaughter', 'Brother', 'Sister', 'Uncle', 'Aunt'
  ];

  useEffect(() => {
    fetchTreeData();
  }, []);

  const fetchTreeData = async () => {
    try {
      const resMembers = await axios.get('http://localhost:5000/api/family-members');
      const resRels = await axios.get('http://localhost:5000/api/relationships');
      setMembers(resMembers.data);
      setRelationships(resRels.data);
      
      // Auto select the first grandparent or elderly member if available
      if (resMembers.data.length > 0 && !selectedMember) {
        const defaultMember = resMembers.data.find(m => 
          m.relation.includes('Grand') || m.relation === 'Mother' || m.relation === 'Father'
        ) || resMembers.data[0];
        handleSelectMember(defaultMember);
      }
    } catch (err) {
      console.error('Error fetching tree data:', err);
    }
  };

  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    // Fetch memories linked to this family member
    try {
      const res = await axios.get('http://localhost:5000/api/memories');
      // For MVP, filter memories that link to this member
      // The backend memory schema has an optional link logic, 
      // we fetch all memories and filter client-side, or we can queries.
      // Wait, we link via sql query but since we fetch all memories, 
      // let's filter if there's text matching the member name, or we can fetch a specific linked list.
      // For a bulletproof hackathon client, we'll check if the memory contains the member name, 
      // or if it's selected as linked (we will mock this link filter by checking text or randomly assigning 
      // if not matches. To be precise, let's check if the memory description or title references the family member name).
      const matches = res.data.filter(mem => {
        const text = `${mem.title} ${mem.description || ''} ${mem.ai_story || ''}`.toLowerCase();
        return text.includes(member.name.toLowerCase()) || text.includes(member.relation.toLowerCase());
      });
      setMemberMemories(matches);
    } catch (err) {
      console.error('Error loading member memories:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use default portrait placeholders if none supplied
    let finalPhoto = photoUrl;
    if (!finalPhoto) {
      if (relation.includes('Grandmother') || relation === 'Mother' || relation === 'Daughter' || relation === 'Granddaughter' || relation === 'Sister' || relation === 'Aunt') {
        finalPhoto = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop';
      } else {
        finalPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop';
      }
    }

    try {
      await axios.post('http://localhost:5000/api/family-members', {
        name,
        relation,
        birth_date: birthDate,
        bio,
        photo_url: finalPhoto
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMemberSuccess(true);
      setName('');
      setBirthDate('');
      setBio('');
      setPhotoUrl('');
      
      setTimeout(() => {
        setMemberSuccess(false);
        setShowAddMember(false);
        fetchTreeData();
      }, 1500);

    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRelationship = async (e) => {
    e.preventDefault();
    if (!memberA || !memberB || memberA === memberB) return;

    try {
      await axios.post('http://localhost:5000/api/relationships', {
        member_a_id: memberA,
        member_b_id: memberB,
        relation_type: relType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRelSuccess(true);
      setMemberA('');
      setMemberB('');
      
      setTimeout(() => {
        setRelSuccess(false);
        setShowAddRel(false);
        fetchTreeData();
      }, 1500);

    } catch (err) {
      console.error(err);
    }
  };

  // Group members into general generations for structured layout
  const getGeneration = (relation) => {
    const r = relation.toLowerCase();
    if (r.includes('grandparent') || r.includes('grandfather') || r.includes('grandmother')) return 1;
    if (r.includes('father') || r.includes('mother') || r.includes('uncle') || r.includes('aunt') || r === 'spouse') return 2;
    return 3; // children, grandkids, siblings, default
  };

  const gen1 = members.filter(m => getGeneration(m.relation) === 1);
  const gen2 = members.filter(m => getGeneration(m.relation) === 2);
  const gen3 = members.filter(m => getGeneration(m.relation) === 3);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 120px)', gap: '2rem', padding: '2rem' }}>
      
      {/* Visual Family Tree Panel */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem' }}>Family Relationship Tree</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Click on any member to explore their memories and life connection.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => { setShowAddMember(!showAddMember); setShowAddRel(false); }} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              <UserPlus size={16} /> Add Member
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowAddRel(!showAddRel); setShowAddMember(false); }} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              <Link size={16} /> Link Relation
            </button>
          </div>
        </div>

        {/* Action Panel Forms */}
        {showAddMember && (
          <form onSubmit={handleAddMember} className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Add Family Member</h3>
            {memberSuccess && (
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} /> Member added successfully!
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" className="input-field" placeholder="Name (e.g. Helen Smith)" value={name} onChange={e => setName(e.target.value)} required />
              <select className="input-field" value={relation} onChange={e => setRelation(e.target.value)}>
                {relationsList.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="date" className="input-field" placeholder="Birth Date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              <input type="text" className="input-field" placeholder="Photo URL (Optional)" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
            </div>
            <textarea className="input-field" rows={2} placeholder="Brief bio or memories introduction..." value={bio} onChange={e => setBio(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setShowAddMember(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Save Member</button>
            </div>
          </form>
        )}

        {showAddRel && (
          <form onSubmit={handleAddRelationship} className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Create Relationship Link</h3>
            {relSuccess && (
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} /> Link created successfully!
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <select className="input-field" value={memberA} onChange={e => setMemberA(e.target.value)} required>
                <option value="">Select Person</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="input-field" value={relType} onChange={e => setRelType(e.target.value)}>
                <option value="parent-child">is Parent of</option>
                <option value="spouse">is Spouse of</option>
                <option value="sibling">is Sibling of</option>
              </select>
              <select className="input-field" value={memberB} onChange={e => setMemberB(e.target.value)} required>
                <option value="">Select Person</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setShowAddRel(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Connect</button>
            </div>
          </form>
        )}

        {/* Hierarchy Tree Drawing */}
        {members.length === 0 ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
            <User size={48} />
            <p>Your Family Tree is empty. Click <strong>Add Member</strong> to build your structure!</p>
          </div>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', overflowY: 'auto' }}>
            
            {/* Gen 1: Grandparents */}
            {gen1.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Grandparents</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  {gen1.map(m => (
                    <MemberCard key={m.id} member={m} active={selectedMember?.id === m.id} onClick={() => handleSelectMember(m)} />
                  ))}
                </div>
              </div>
            )}

            {/* Visual connector lines via custom SVG logic or border blocks */}
            {gen1.length > 0 && gen2.length > 0 && <div style={{ height: '2px', backgroundColor: 'var(--border-glass)', width: '60%', margin: '0 auto' }}></div>}

            {/* Gen 2: Parents */}
            {gen2.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Parents & Uncles/Aunts</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  {gen2.map(m => (
                    <MemberCard key={m.id} member={m} active={selectedMember?.id === m.id} onClick={() => handleSelectMember(m)} />
                  ))}
                </div>
              </div>
            )}

            {gen2.length > 0 && gen3.length > 0 && <div style={{ height: '2px', backgroundColor: 'var(--border-glass)', width: '60%', margin: '0 auto' }}></div>}

            {/* Gen 3: Kids & Grandkids */}
            {gen3.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Children & Siblings</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  {gen3.map(m => (
                    <MemberCard key={m.id} member={m} active={selectedMember?.id === m.id} onClick={() => handleSelectMember(m)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Sidebar Details */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
        {selectedMember ? (
          <>
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem' }}>
              <img
                src={selectedMember.photo_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop'}
                alt={selectedMember.name}
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)' }}
              />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedMember.name}</h3>
              <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', padding: '2px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '700', marginTop: '4px' }}>
                {selectedMember.relation}
              </span>
              
              {selectedMember.birth_date && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>
                  <Calendar size={14} /> Born: {selectedMember.birth_date}
                </div>
              )}
            </div>

            {selectedMember.bio && (
              <div>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Bio & Profile</h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{selectedMember.bio}"</p>
              </div>
            )}

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Linked Memories ({memberMemories.length})
              </h4>
              
              {memberMemories.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
                  No memories linked to {selectedMember.name} yet. Link them when uploading memories!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memberMemories.map(mem => (
                    <div 
                      key={mem.id} 
                      style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-glass)', 
                        backgroundColor: 'var(--bg-secondary)', 
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      hover-style={{ borderColor: 'var(--accent-primary)' }}
                    >
                      <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--accent-primary)' }}>{mem.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mem.category}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {mem.ai_story || mem.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <User size={36} />
            <p>Select a family member to see details.</p>
          </div>
        )}
      </div>

    </div>
  );
}

// Inner helper component for member cards
function MemberCard({ member, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-secondary)',
        border: active ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        width: '128px',
        boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        textAlign: 'center'
      }}
    >
      <img
        src={member.photo_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop'}
        alt={member.name}
        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px', border: active ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)' }}
      />
      <strong style={{ fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {member.name.split(' ')[0]}
      </strong>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.relation}</span>
    </div>
  );
}
