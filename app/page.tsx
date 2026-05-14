"use client";

import { useEffect, useState, useMemo } from "react";
import { User } from "./types/user";
import { fetchUsers } from "./services/api";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | number | null>(null);
  const [editingUid, setEditingUid] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [newUser, setNewUser] = useState({
    name: "",
    birth_date: "",
    hobbies: [] as string[],
    country: "",
    address: {
      street: "",
      city: "",
      postal_code: "",
    },
  });


  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    const newId = Date.now().toString();
    setUsers((prev) => [...prev, { ...newUser, uid: newId } as User]);

    setNewUser({
      name: "",
      birth_date: "",
      hobbies: [],
      country: "",
      address: { street: "", city: "", postal_code: "" },
    });
  };

  const startEditing = (user: User) => {
    setEditingUid(user.uid);
    setEditFormData({ ...user, address: { ...user.address } });
  };

  const saveEditing = () => {
    setUsers((prev) => 
      prev.map((u) => u.uid === editingUid ? (editFormData as User) : u)
    );
    setEditingUid(null);
  };

  const cancelEditing = () => {
    setEditingUid(null);
  };


  useEffect(() => {
    fetchData();
  }, []);

  const hobbyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user) => {
      user.hobbies.forEach((hobby) => {
        if (!hobby) return;
        const normalized = hobby.trim();
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    });
    return counts;
  }, [users]);

  return (
    <div>
      <h1 className="page-title">User Management</h1>
      <button onClick={fetchData} className="btn-primary">Refresh</button>
      
      <div className="hobby-container">
        <h3>Hobby Statistics:</h3>
        <div className="hobby-list">
          {Object.entries(hobbyCounts).map(([hobby, count]) => (
            <span key={hobby} className="hobby-pill">
              {hobby}: <strong>{count}</strong>
            </span>
          ))}
          {Object.keys(hobbyCounts).length === 0 && <span>No hobbies found.</span>}
        </div>
      </div>
      
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && (
        <table className="user-table">
          <thead>
            <tr>
              <th className="table-cell">Name</th>
              <th className="table-cell">Birth Date</th>
              <th className="table-cell">Hobbies</th>
              <th className="table-cell">Country</th>
              <th className="table-cell">Street</th>
              <th className="table-cell">City</th>
              <th className="table-cell">Postal Code</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isEditing = editingUid === user.uid;
              const rowClass = isEditing 
                ? 'row-editing' 
                : (selectedUid === user.uid ? 'row-selected' : 'row-default');

              return (
              <tr key={user.uid}
                  onClick={() => !isEditing && setSelectedUid(user.uid)}
                  className={rowClass}>
                
                {isEditing ? (
                  <>
                    <td className="table-cell">
                      <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="date" value={editFormData.birth_date} onChange={e => setEditFormData({...editFormData, birth_date: e.target.value})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="text" value={editFormData.hobbies.join(", ")} onChange={e => setEditFormData({...editFormData, hobbies: e.target.value.split(", ").map((h: string) => h.trim())})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="text" value={editFormData.country} onChange={e => setEditFormData({...editFormData, country: e.target.value})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="text" value={editFormData.address.street} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="text" value={editFormData.address.city} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, city: e.target.value}})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <input type="text" value={editFormData.address.postal_code} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, postal_code: e.target.value}})} className="table-input" />
                    </td>
                    <td className="table-cell">
                      <button onClick={(e) => { e.stopPropagation(); saveEditing(); }} className="btn-save">Save</button>
                      <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="btn-cancel">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="table-cell">{user.name}</td>
                    <td className="table-cell">{user.birth_date}</td>
                    <td className="table-cell">{user.hobbies.join(", ")}</td>
                    <td className="table-cell">{user.country}</td>
                    <td className="table-cell">{user.address.street}</td>
                    <td className="table-cell">{user.address.city}</td>
                    <td className="table-cell">{user.address.postal_code}</td>
                    <td className="table-cell">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        startEditing(user);
                      }} className="btn-edit">Edit</button>
                    </td>
                  </>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      )}
      
      <h2 className="section-title">Add New User</h2>
      <div className="add-form">
        <input type="text" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
        <input type="date" placeholder="Birth Date" value={newUser.birth_date} onChange={(e) => setNewUser({...newUser, birth_date: e.target.value})} />
        <input type="text" placeholder="Hobbies (comma separated)" value={newUser.hobbies.join(", ")} onChange={(e) => setNewUser({...newUser, hobbies: e.target.value.split(", ").map((hobby) => hobby.trim())})} />
        <input type="text" placeholder="Country" value={newUser.country} onChange={(e) => setNewUser({...newUser, country: e.target.value})} />
        <input type="text" placeholder="Street" value={newUser.address.street} onChange={(e) => setNewUser({...newUser, address: {...newUser.address, street: e.target.value}})} />
        <input type="text" placeholder="City" value={newUser.address.city} onChange={(e) => setNewUser({...newUser, address: {...newUser.address, city: e.target.value}})} />
        <input type="text" placeholder="Postal Code" value={newUser.address.postal_code} onChange={(e) => setNewUser({...newUser, address: {...newUser.address, postal_code: e.target.value}})} />
        <button onClick={handleAddUser} className="btn-add">Add User</button>
      </div>
    </div>
  );
}
