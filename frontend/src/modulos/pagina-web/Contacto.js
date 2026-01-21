import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';
import './BoutiqueLanding.css';

const Contacto = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);

        // Simular envío (aquí podrías integrar con tu backend)
        setTimeout(() => {
            setSending(false);
            setSuccess(true);
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            });

            // Ocultar mensaje de éxito después de 5 segundos
            setTimeout(() => setSuccess(false), 5000);
        }, 1500);
    };

    return (
        <div className="boutique-container">
            <BarraNavegacion />

            {/* HERO SECTION */}
            <section style={{
                width: '100%',
                minHeight: '50vh',
                background: 'linear-gradient(135deg, #CFB3A9 0%, #E8C4C4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '100px 20px 60px',
                marginTop: '80px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: '14px',
                        letterSpacing: '5px',
                        color: '#2C2C2C',
                        marginBottom: '20px',
                        textTransform: 'uppercase',
                        fontWeight: '700'
                    }}>Visítanos en Cuenca</p>
                    <h1 style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '3.5rem',
                        color: '#2C2C2C',
                        marginBottom: '30px',
                        lineHeight: '1.2'
                    }}>Contáctanos</h1>
                    <p style={{
                        fontSize: '1.1rem',
                        color: '#666',
                        lineHeight: '1.8',
                        maxWidth: '700px',
                        margin: '0 auto'
                    }}>
                        ¿Tienes alguna pregunta? Nos encantaría escucharte
                    </p>
                </div>
            </section>

            {/* CONTACT CONTENT */}
            <section style={{
                width: '100%',
                padding: '80px 20px',
                backgroundColor: '#FFFFFF'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '60px'
                    }}>
                        {/* CONTACT INFO */}
                        <div>
                            <h2 style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '2rem',
                                color: '#2C2C2C',
                                marginBottom: '40px'
                            }}>Información de Contacto</h2>

                            <div style={{
                                backgroundColor: '#F9F7F5',
                                padding: '40px',
                                borderRadius: '4px',
                                boxShadow: '0 10px 30px rgba(160, 144, 134, 0.1)'
                            }}>
                                {/* Email */}
                                <div style={{
                                    marginBottom: '35px',
                                    paddingBottom: '35px',
                                    borderBottom: '1px solid #E4D8CB'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            backgroundColor: '#CFB3A9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                <polyline points="22,6 12,13 2,6"></polyline>
                                            </svg>
                                        </div>
                                        <h3 style={{
                                            fontFamily: "'Cinzel', serif",
                                            fontSize: '1.1rem',
                                            color: '#2C2C2C',
                                            margin: 0
                                        }}>Email</h3>
                                    </div>
                                    <p style={{
                                        marginLeft: '60px',
                                        color: '#666',
                                        fontSize: '0.95rem'
                                    }}>
                                        <a href="mailto:ventas@luxuryboutique.com" style={{
                                            color: '#CFB3A9',
                                            textDecoration: 'none'
                                        }}>ventas@luxuryboutique.com</a>
                                    </p>
                                </div>

                                {/* Phone */}
                                <div style={{
                                    marginBottom: '35px',
                                    paddingBottom: '35px',
                                    borderBottom: '1px solid #E4D8CB'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            backgroundColor: '#A09086',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                            </svg>
                                        </div>
                                        <h3 style={{
                                            fontFamily: "'Cinzel', serif",
                                            fontSize: '1.1rem',
                                            color: '#2C2C2C',
                                            margin: 0
                                        }}>Teléfono</h3>
                                    </div>
                                    <p style={{
                                        marginLeft: '60px',
                                        color: '#666',
                                        fontSize: '0.95rem'
                                    }}>
                                        <a href="tel:+593986123920" style={{
                                            color: '#A09086',
                                            textDecoration: 'none'
                                        }}>098 612 3920</a>
                                    </p>
                                </div>

                                {/* Address */}
                                <div style={{
                                    marginBottom: '35px',
                                    paddingBottom: '35px',
                                    borderBottom: '1px solid #E4D8CB'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            backgroundColor: '#E8C4C4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                <circle cx="12" cy="10" r="3"></circle>
                                            </svg>
                                        </div>
                                        <h3 style={{
                                            fontFamily: "'Cinzel', serif",
                                            fontSize: '1.1rem',
                                            color: '#2C2C2C',
                                            margin: 0
                                        }}>Ubicación</h3>
                                    </div>
                                    <p style={{
                                        marginLeft: '60px',
                                        color: '#666',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.6'
                                    }}>
                                        Luxe Boutique<br />
                                        Cuenca, Ecuador
                                    </p>
                                </div>

                                {/* Horarios */}
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            backgroundColor: '#D8C3B9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                        </div>
                                        <h3 style={{
                                            fontFamily: "'Cinzel', serif",
                                            fontSize: '1.1rem',
                                            color: '#2C2C2C',
                                            margin: 0
                                        }}>Horario</h3>
                                    </div>
                                    <p style={{
                                        marginLeft: '60px',
                                        color: '#666',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.8'
                                    }}>
                                        Lun - Vie: 9:00 AM - 6:45 PM<br />
                                        Sábado: 10:00 AM - 6:45 PM<br />
                                        Dom y Mié: CERRADO
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CONTACT FORM */}
                        <div>
                            <h2 style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '2rem',
                                color: '#2C2C2C',
                                marginBottom: '40px'
                            }}>Envíanos un Mensaje</h2>

                            {success && (
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: '#D4EDDA',
                                    color: '#155724',
                                    borderRadius: '4px',
                                    marginBottom: '30px',
                                    borderLeft: '4px solid #28A745'
                                }}>
                                    ✓ ¡Mensaje enviado exitosamente! Te responderemos pronto.
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{
                                backgroundColor: '#F9F7F5',
                                padding: '40px',
                                borderRadius: '4px',
                                boxShadow: '0 10px 30px rgba(160, 144, 134, 0.1)'
                            }}>
                                {/* Name */}
                                <div style={{ marginBottom: '25px' }}>
                                    <label htmlFor="name" style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#2C2C2C',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '600'
                                    }}>Nombre Completo *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            border: '1px solid #E4D8CB',
                                            borderRadius: '2px',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF'
                                        }}
                                    />
                                </div>

                                {/* Email */}
                                <div style={{ marginBottom: '25px' }}>
                                    <label htmlFor="email" style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#2C2C2C',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '600'
                                    }}>Email *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            border: '1px solid #E4D8CB',
                                            borderRadius: '2px',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF'
                                        }}
                                    />
                                </div>

                                {/* Phone */}
                                <div style={{ marginBottom: '25px' }}>
                                    <label htmlFor="phone" style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#2C2C2C',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '600'
                                    }}>Teléfono</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            border: '1px solid #E4D8CB',
                                            borderRadius: '2px',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF'
                                        }}
                                    />
                                </div>

                                {/* Subject */}
                                <div style={{ marginBottom: '25px' }}>
                                    <label htmlFor="subject" style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#2C2C2C',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '600'
                                    }}>Asunto *</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            border: '1px solid #E4D8CB',
                                            borderRadius: '2px',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF'
                                        }}
                                    />
                                </div>

                                {/* Message */}
                                <div style={{ marginBottom: '30px' }}>
                                    <label htmlFor="message" style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: '#2C2C2C',
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '600'
                                    }}>Mensaje *</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows="6"
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            border: '1px solid #E4D8CB',
                                            borderRadius: '2px',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    ></textarea>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="hover-float"
                                    style={{
                                        width: '100%',
                                        padding: '18px',
                                        backgroundColor: sending ? '#A09086' : '#CFB3A9',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '2px',
                                        fontSize: '14px',
                                        letterSpacing: '2px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        cursor: sending ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {sending ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* MAP */}
                    <div style={{
                        marginTop: '80px',
                        height: '400px',
                        backgroundColor: '#E4D8CB',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        <iframe
                            title="Ubicación Luxe"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d249.04456396755182!2d-79.0046849466266!3d-2.8987975850757297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91cd190035dde331%3A0x381e10e747cbd16e!2sLuxury%20Boutique!5e0!3m2!1ses!2sec!4v1769018295740!5m2!1ses!2sec"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </div>
            </section>

            <PiePagina />
        </div>
    );
};

export default Contacto;
