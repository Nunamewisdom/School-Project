import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

/**
 * Generate a consultation summary PDF
 * @param {Object} data - Summary data
 * @param {Object} data.profile - Patient profile
 * @param {Date} data.startDate - Period start
 * @param {Date} data.endDate - Period end
 * @param {Array} data.medications - Medication adherence data
 * @param {Array} data.symptoms - Symptom logs
 * @param {Array} data.appointments - Appointments in period
 * @param {Array} data.healthMetrics - Health metrics data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateSummaryPdf(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Health Summary - ${data.profile?.name || 'Patient'}`,
                    Author: 'MediBuddy',
                    Subject: 'Consultation Summary'
                }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            renderHeader(doc, data);

            // Patient Info
            renderPatientInfo(doc, data);

            // Medication Adherence
            if (data.medications?.length > 0) {
                renderMedicationSection(doc, data.medications);
            }

            // Symptoms
            if (data.symptoms?.length > 0) {
                renderSymptomsSection(doc, data.symptoms);
            }

            // Health Metrics
            if (data.healthMetrics?.length > 0) {
                renderHealthMetricsSection(doc, data.healthMetrics);
            }

            // Appointments
            if (data.appointments?.length > 0) {
                renderAppointmentsSection(doc, data.appointments);
            }

            // Footer
            renderFooter(doc);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Render PDF header
 */
function renderHeader(doc, data) {
    // MediBuddy logo/title
    doc.fontSize(24)
        .fillColor('#0f766e')
        .text('MediBuddy', { align: 'center' });

    doc.fontSize(16)
        .fillColor('#374151')
        .text('Health Consultation Summary', { align: 'center' });

    doc.moveDown();

    // Period
    const startStr = format(new Date(data.startDate), 'MMM d, yyyy');
    const endStr = format(new Date(data.endDate), 'MMM d, yyyy');

    doc.fontSize(12)
        .fillColor('#6b7280')
        .text(`Period: ${startStr} - ${endStr}`, { align: 'center' });

    doc.moveDown(2);

    // Divider
    doc.strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

    doc.moveDown();
}

/**
 * Render patient information
 */
function renderPatientInfo(doc, data) {
    const profile = data.profile || {};

    doc.fontSize(14)
        .fillColor('#0f766e')
        .text('Patient Information');

    doc.moveDown(0.5);

    doc.fontSize(11)
        .fillColor('#374151');

    if (profile.name) {
        doc.text(`Name: ${profile.name}`);
    }
    if (profile.dateOfBirth) {
        const dob = format(new Date(profile.dateOfBirth), 'MMM d, yyyy');
        doc.text(`Date of Birth: ${dob}`);
    }
    if (profile.conditions?.length > 0) {
        doc.text(`Conditions: ${profile.conditions.join(', ')}`);
    }
    if (profile.allergies?.length > 0) {
        doc.text(`Allergies: ${profile.allergies.join(', ')}`);
    }

    doc.moveDown(1.5);
}

/**
 * Render medication adherence section
 */
function renderMedicationSection(doc, medications) {
    checkPageBreak(doc);

    doc.fontSize(14)
        .fillColor('#0f766e')
        .text('Medication Adherence');

    doc.moveDown(0.5);

    // Calculate overall adherence
    const totalDoses = medications.reduce((sum, m) => sum + (m.totalDoses || 0), 0);
    const takenDoses = medications.reduce((sum, m) => sum + (m.takenDoses || 0), 0);
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    doc.fontSize(11)
        .fillColor('#374151')
        .text(`Overall Adherence: ${adherenceRate}% (${takenDoses}/${totalDoses} doses)`);

    doc.moveDown(0.5);

    // Individual medications
    medications.forEach(med => {
        const medAdherence = med.totalDoses > 0
            ? Math.round((med.takenDoses / med.totalDoses) * 100)
            : 0;

        doc.fontSize(10)
            .fillColor('#4b5563')
            .text(`• ${med.name}: ${medAdherence}%`, { indent: 10 });
    });

    doc.moveDown(1.5);
}

/**
 * Render symptoms section
 */
function renderSymptomsSection(doc, symptoms) {
    checkPageBreak(doc);

    doc.fontSize(14)
        .fillColor('#0f766e')
        .text('Symptom Log');

    doc.moveDown(0.5);

    // Group by symptom type
    const grouped = symptoms.reduce((acc, s) => {
        const name = s.name || 'Other';
        if (!acc[name]) acc[name] = [];
        acc[name].push(s);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, logs]) => {
        const avgSeverity = logs.reduce((sum, l) => sum + (l.severity || 0), 0) / logs.length;

        doc.fontSize(10)
            .fillColor('#4b5563')
            .text(`• ${name}: ${logs.length} occurrences, avg severity ${avgSeverity.toFixed(1)}/10`, { indent: 10 });
    });

    doc.moveDown(1.5);
}

/**
 * Render health metrics section
 */
function renderHealthMetricsSection(doc, healthMetrics) {
    checkPageBreak(doc);

    doc.fontSize(14)
        .fillColor('#0f766e')
        .text('Health Metrics');

    doc.moveDown(0.5);

    // Group by type
    const grouped = healthMetrics.reduce((acc, m) => {
        const type = m.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(m);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([type, metrics]) => {
        const values = metrics.map(m => m.value).filter(v => typeof v === 'number');
        if (values.length === 0) return;

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        const label = formatMetricType(type);
        const unit = getMetricUnit(type);

        doc.fontSize(10)
            .fillColor('#4b5563')
            .text(`• ${label}: Avg ${avg.toFixed(1)}${unit} (Range: ${min}${unit} - ${max}${unit})`, { indent: 10 });
    });

    doc.moveDown(1.5);
}

/**
 * Render appointments section
 */
function renderAppointmentsSection(doc, appointments) {
    checkPageBreak(doc);

    doc.fontSize(14)
        .fillColor('#0f766e')
        .text('Appointments');

    doc.moveDown(0.5);

    appointments.forEach(apt => {
        const dateStr = apt.dateTime
            ? format(new Date(apt.dateTime), 'MMM d, yyyy h:mm a')
            : 'TBD';

        const status = apt.status || 'scheduled';
        const statusIcon = status === 'completed' ? '✓' : status === 'cancelled' ? '✗' : '○';

        doc.fontSize(10)
            .fillColor('#4b5563')
            .text(`${statusIcon} ${apt.doctor?.name || 'Doctor'} - ${dateStr}`, { indent: 10 });

        if (apt.notes) {
            doc.fontSize(9)
                .fillColor('#6b7280')
                .text(`   Notes: ${apt.notes}`, { indent: 20 });
        }
    });

    doc.moveDown(1.5);
}

/**
 * Render footer
 */
function renderFooter(doc) {
    const footerY = doc.page.height - 50;

    doc.fontSize(8)
        .fillColor('#9ca3af')
        .text(
            `Generated by MediBuddy on ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
            50,
            footerY,
            { align: 'center', width: 495 }
        );

    doc.text(
        'This document is for informational purposes only. Please consult your healthcare provider for medical advice.',
        50,
        footerY + 12,
        { align: 'center', width: 495 }
    );
}

/**
 * Check if page break is needed
 */
function checkPageBreak(doc, minSpace = 100) {
    if (doc.y > doc.page.height - minSpace - 50) {
        doc.addPage();
    }
}

/**
 * Format metric type for display
 */
function formatMetricType(type) {
    const labels = {
        steps: 'Steps',
        sleep: 'Sleep',
        weight: 'Weight',
        heart_rate: 'Heart Rate',
        blood_pressure: 'Blood Pressure',
        glucose: 'Glucose'
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Get unit for metric type
 */
function getMetricUnit(type) {
    const units = {
        steps: ' steps',
        sleep: ' hrs',
        weight: ' kg',
        heart_rate: ' bpm',
        glucose: ' mg/dL'
    };
    return units[type] || '';
}

export default { generateSummaryPdf };
